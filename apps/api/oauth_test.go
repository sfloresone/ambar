package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	mathrand "math/rand/v2"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"

	"ambar/api/auth"
	"ambar/api/oauth"
)

// fakeGitHub plays GitHub: token endpoint (checking the PKCE verifier against the challenge it saw) and
// the REST API. code picks the outcome: "good", "unverified" (GitHub's 200 + error), anything else fails.
type fakeGitHub struct {
	*httptest.Server
	challenge string
	// id and email are the GitHub account signing in; tests make them unique per run.
	id       string
	email    string
	verified bool
}

func newFakeGitHub(t *testing.T) *fakeGitHub {
	f := &fakeGitHub{verified: true, id: strconv.Itoa(1 + mathrand.IntN(1<<30))}
	mux := http.NewServeMux()

	mux.HandleFunc("POST /token", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		sum := sha256.Sum256([]byte(r.PostForm.Get("code_verifier")))
		w.Header().Set("Content-Type", "application/json")

		switch {
		case base64.RawURLEncoding.EncodeToString(sum[:]) != f.challenge:
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"invalid_grant"}`))
		case r.PostForm.Get("code") == "unverified":
			_, _ = w.Write([]byte(`{"error":"unverified_user_email"}`))
		case r.PostForm.Get("code") == "good":
			_, _ = w.Write([]byte(`{"access_token":"gho_test","token_type":"bearer"}`))
		default:
			_, _ = w.Write([]byte(`{"error":"bad_verification_code"}`))
		}
	})
	mux.HandleFunc("GET /api/user", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer gho_test" {
			w.WriteHeader(http.StatusUnauthorized)

			return
		}

		_, _ = w.Write([]byte(`{"id":` + f.id + `}`))
	})
	mux.HandleFunc("GET /api/user/emails", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode([]map[string]any{
			{"email": "other@example.com", "primary": false, "verified": true},
			{"email": f.email, "primary": true, "verified": f.verified},
		})
	})

	f.Server = httptest.NewServer(mux)
	t.Cleanup(f.Close)

	return f
}

func (f *fakeGitHub) provider() *oauth.Provider {
	return oauth.GitHub("client", "secret", "http://localhost:8080/v1/auth/oauth/github/callback", oauth.Endpoints{
		AuthURL: f.URL + "/authorize", TokenURL: f.URL + "/token", APIURL: f.URL + "/api",
	})
}

func newOAuthAPI(t *testing.T, service *auth.Service, providers map[string]*oauth.Provider) http.Handler {
	t.Helper()

	return withContract(newRouter(&api{
		logger:         slog.New(slog.DiscardHandler),
		db:             fakeDB{},
		auth:           service,
		providers:      providers,
		appURL:         app,
		allowedOrigins: []string{app},
	}))
}

// start follows the first redirect and returns the attempt cookie and the state the provider received.
func start(t *testing.T, h http.Handler, f *fakeGitHub, returnTo string) (cookie, state string) {
	t.Helper()

	rec := request(h, "GET", "/v1/auth/oauth/github?returnTo="+url.QueryEscape(returnTo), "192.0.2.20:1", nil, "")
	if rec.Code != http.StatusFound {
		t.Fatalf("start: %d %s", rec.Code, rec.Body.String())
	}

	consent, err := url.Parse(rec.Header().Get("Location"))
	if err != nil || !strings.HasPrefix(consent.String(), f.URL+"/authorize?") {
		t.Fatalf("consent URL: %s", rec.Header().Get("Location"))
	}

	q := consent.Query()
	if q.Get("code_challenge_method") != "S256" || q.Get("scope") != "user:email" || q.Get("redirect_uri") != "http://localhost:8080/v1/auth/oauth/github/callback" {
		t.Fatalf("consent params: %v", q)
	}

	f.challenge = q.Get("code_challenge")

	c := rec.Result().Cookies()[0]
	if c.Name != oauthCookie || !c.HttpOnly || c.SameSite != http.SameSiteLaxMode || c.MaxAge != 600 {
		t.Fatalf("attempt cookie: %+v", c)
	}

	return c.Name + "=" + c.Value, q.Get("state")
}

func callback(h http.Handler, cookie, query string) *httptest.ResponseRecorder {
	headers := map[string]string{}
	if cookie != "" {
		headers["Cookie"] = cookie
	}

	return request(h, "GET", "/v1/auth/oauth/github/callback?"+query, "192.0.2.20:1", headers, "")
}

func TestOAuthWithoutDatabase(t *testing.T) {
	f := newFakeGitHub(t)
	h := newOAuthAPI(t, nil, map[string]*oauth.Provider{"github": f.provider()})

	if rec := request(h, "GET", "/v1/auth/oauth/google", "192.0.2.21:1", nil, ""); rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "provider-unavailable") {
		t.Fatalf("unconfigured provider: %d %s", rec.Code, rec.Body.String())
	}

	want := func(rec *httptest.ResponseRecorder, code string) {
		t.Helper()

		if rec.Code != http.StatusFound || rec.Header().Get("Location") != app+"/login?error="+code {
			t.Fatalf("want %s: %d %s", code, rec.Code, rec.Header().Get("Location"))
		}

		// The attempt is used up whatever happened.
		for _, c := range rec.Result().Cookies() {
			if c.Name == oauthCookie && c.MaxAge >= 0 {
				t.Fatalf("attempt cookie not cleared: %+v", c)
			}
		}
	}

	cookie, state := start(t, h, f, "")
	want(callback(h, "", "code=good&state="+state), "oauth-state")
	want(callback(h, cookie, "code=good&state=forged"), "oauth-state")
	want(callback(h, cookie, "error=access_denied&state="+state), "oauth-cancelled")
	want(callback(h, cookie, "error=redirect_uri_mismatch&state="+state), "oauth-failed")
	want(callback(h, cookie, "code=expired&state="+state), "oauth-failed")
	want(callback(h, cookie, "code=unverified&state="+state), "oauth-email")

	f.verified = false
	want(callback(h, cookie, "code=good&state="+state), "oauth-email")

	// A verifier other than the one behind the challenge is refused by the provider (PKCE).
	f.verified, f.challenge = true, "not-the-challenge"
	want(callback(h, cookie, "code=good&state="+state), "oauth-failed")

	// With a valid attempt, errors go back where the flow started, keeping its query.
	cookie, state = start(t, h, f, app+"/login?entry=iris")
	if rec := callback(h, cookie, "error=access_denied&state="+state); rec.Header().Get("Location") != app+"/login?entry=iris&error=oauth-cancelled" {
		t.Fatalf("error to returnTo: %s", rec.Header().Get("Location"))
	}

	providers := request(h, "GET", "/v1/auth/providers", "192.0.2.21:1", nil, "")
	if providers.Code != http.StatusOK || strings.TrimSpace(providers.Body.String()) != `{"providers":["github"]}` {
		t.Fatalf("providers: %d %s", providers.Code, providers.Body.String())
	}

	if rec := request(newOAuthAPI(t, nil, nil), "GET", "/v1/auth/providers", "192.0.2.21:1", nil, ""); strings.TrimSpace(rec.Body.String()) != `{"providers":[]}` {
		t.Fatalf("no providers: %s", rec.Body.String())
	}
}

// The whole browser flow against Postgres: start → provider → callback → session cookie → returnTo.
func TestOAuthSignIn(t *testing.T) {
	pool := testPool(t)
	f := newFakeGitHub(t)
	f.email = "oauth-" + randomSuffix() + "@example.com"
	h := newOAuthAPI(t, auth.NewService(pool, &captureMailer{}, []byte("test-secret-test-secret-test-secret"), app), map[string]*oauth.Provider{"github": f.provider()})

	// The first sign-in creates the account, the next ones sign in to it; returnTo off our origins falls back.
	for _, c := range []struct{ returnTo, want string }{
		{app + "/login?entry=iris", app + "/login?entry=iris&oauth=created"},
		{"https://evil.example/phish", app + "/login?oauth=signed-in"},
	} {
		returnTo, want := c.returnTo, c.want
		cookie, state := start(t, h, f, returnTo)

		rec := callback(h, cookie, "code=good&state="+state)
		if rec.Code != http.StatusFound || rec.Header().Get("Location") != want {
			t.Fatalf("returnTo %s: %d → %s", returnTo, rec.Code, rec.Header().Get("Location"))
		}

		var session *http.Cookie

		for _, c := range rec.Result().Cookies() {
			if c.Name == sessionCookie {
				session = c
			}
		}

		if session == nil || !session.HttpOnly {
			t.Fatalf("no session cookie: %v", rec.Result().Cookies())
		}

		me := request(h, "GET", "/v1/auth/session", "192.0.2.22:1", map[string]string{"Cookie": session.Name + "=" + session.Value}, "")
		if me.Code != http.StatusOK || !strings.Contains(me.Body.String(), f.email) {
			t.Fatalf("session: %d %s", me.Code, me.Body.String())
		}
	}
}
