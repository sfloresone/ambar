package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"ambar/api/auth"
	"ambar/api/migrations"
)

type fakeDB struct{ err error }

func (f fakeDB) Ping(context.Context) error { return f.err }

const app = "http://localhost:5173"

func newTestAPI(logs *bytes.Buffer, db pinger, service *auth.Service, trustProxy bool) http.Handler {
	return newRouter(&api{
		logger:         slog.New(slog.NewJSONHandler(logs, nil)),
		db:             db,
		auth:           service,
		allowedOrigins: []string{app},
		trustProxy:     trustProxy,
	})
}

func request(h http.Handler, method, path, remoteAddr string, headers map[string]string, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.RemoteAddr = remoteAddr

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	return rec
}

func TestHealth(t *testing.T) {
	var logs bytes.Buffer

	if rec := request(newTestAPI(&logs, fakeDB{}, nil, false), "GET", "/healthz", "192.0.2.1:1", nil, ""); rec.Code != http.StatusOK {
		t.Fatalf("db up: got %d", rec.Code)
	}

	rec := request(newTestAPI(&logs, fakeDB{err: errors.New("refused")}, nil, false), "GET", "/healthz", "192.0.2.1:1", nil, "")
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("db down: got %d", rec.Code)
	}
}

func TestRequestLogUsesRoutePatternNotRawPath(t *testing.T) {
	var logs bytes.Buffer

	request(newTestAPI(&logs, fakeDB{}, nil, false), "GET", "/healthz?token=secret", "192.0.2.1:1", nil, "")

	for _, want := range []string{`"msg":"request"`, `"route":"/healthz"`, `"status":200`, `"request_id":`, `"ip":"192.0.2.1"`} {
		if !strings.Contains(logs.String(), want) {
			t.Errorf("log missing %s: %s", want, logs.String())
		}
	}

	if strings.Contains(logs.String(), "secret") {
		t.Fatalf("query leaked into logs: %s", logs.String())
	}
}

func TestRateLimitPerClientAndProxyTrust(t *testing.T) {
	var logs bytes.Buffer
	spoofed := map[string]string{"X-Real-IP": "203.0.113.9", "X-Forwarded-For": "203.0.113.9"}

	// Without TRUST_PROXY, IP headers are ignored: rotating them doesn't reset the limit.
	direct := newTestAPI(&logs, fakeDB{}, nil, false)

	var last int
	for range 121 {
		last = request(direct, "GET", "/healthz", "198.51.100.4:1000", spoofed, "").Code
	}

	if last != http.StatusTooManyRequests {
		t.Fatalf("121st request: got %d, want 429", last)
	}

	// Behind the proxy, each X-Real-IP is its own client.
	proxied := newTestAPI(&logs, fakeDB{}, nil, true)
	if code := request(proxied, "GET", "/healthz", "127.0.0.1:1", map[string]string{"X-Real-IP": "203.0.113.10"}, "").Code; code != http.StatusOK {
		t.Fatalf("proxied client: got %d", code)
	}
}

func TestBrowserGuards(t *testing.T) {
	var logs bytes.Buffer
	h := newTestAPI(&logs, fakeDB{}, nil, false)
	jsonFrom := func(origin string) map[string]string {
		return map[string]string{"Content-Type": "application/json", "Origin": origin}
	}

	if rec := request(h, "POST", "/v1/auth/email", "192.0.2.2:1", jsonFrom("https://evil.example"), `{"email":"a@b.co"}`); rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site POST: got %d", rec.Code)
	}

	if rec := request(h, "POST", "/v1/auth/email", "192.0.2.2:1", map[string]string{"Content-Type": "text/plain", "Origin": app}, `{}`); rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("form-like POST: got %d", rec.Code)
	}

	preflight := request(h, "OPTIONS", "/v1/auth/email", "192.0.2.2:1", map[string]string{"Origin": app, "Access-Control-Request-Method": "POST"}, "")
	if preflight.Code != http.StatusNoContent || preflight.Header().Get("Access-Control-Allow-Origin") != app || preflight.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatalf("allowed preflight: %d %v", preflight.Code, preflight.Header())
	}

	denied := request(h, "OPTIONS", "/v1/auth/email", "192.0.2.2:1", map[string]string{"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"}, "")
	if denied.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("denied preflight got CORS headers: %v", denied.Header())
	}
}

type captureMailer struct{ code, link string }

func (m *captureMailer) SendSignIn(_ context.Context, _, code, link, _ string) error {
	m.code, m.link = code, link

	return nil
}

// The web flow over HTTP, against Postgres: email → code → cookie → session → sign out.
func TestWebSignInOverHTTP(t *testing.T) {
	if testing.Short() {
		t.Skip("needs Postgres")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://ambar:ambar@localhost:5432/ambar?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	if err := migrations.Up(context.Background(), pool); err != nil {
		t.Fatalf("Postgres: %v", err)
	}

	var logs bytes.Buffer
	mailer := &captureMailer{}
	h := newTestAPI(&logs, pool, auth.NewService(pool, mailer, []byte("test-secret-test-secret-test-secret"), app), false)
	headers := map[string]string{"Content-Type": "application/json", "Origin": app}
	email := "http-" + randomSuffix() + "@example.com"

	rec := request(h, "POST", "/v1/auth/email", "192.0.2.3:1", headers, `{"email":"`+email+`"}`)
	if rec.Code != http.StatusAccepted || !strings.Contains(rec.Body.String(), `"resendAfterMs":30000`) {
		t.Fatalf("request email: %d %s", rec.Code, rec.Body.String())
	}

	rec = request(h, "POST", "/v1/auth/email/verify", "192.0.2.3:1", headers, `{"email":"`+email+`","code":"`+mailer.code+`"}`)
	if rec.Code != http.StatusOK || strings.Contains(rec.Body.String(), `"token"`) {
		t.Fatalf("verify: %d %s", rec.Code, rec.Body.String())
	}

	cookie := rec.Result().Cookies()[0]
	if cookie.Name != sessionCookie || !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("cookie: %+v", cookie)
	}

	withCookie := map[string]string{"Cookie": cookie.Name + "=" + cookie.Value, "Origin": app}
	if rec := request(h, "GET", "/v1/auth/session", "192.0.2.3:1", withCookie, ""); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), email) {
		t.Fatalf("session: %d %s", rec.Code, rec.Body.String())
	}

	if rec := request(h, "DELETE", "/v1/auth/session", "192.0.2.3:1", withCookie, ""); rec.Code != http.StatusNoContent {
		t.Fatalf("sign out: %d", rec.Code)
	}

	if rec := request(h, "GET", "/v1/auth/session", "192.0.2.3:1", withCookie, ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("after sign out: %d", rec.Code)
	}

	// returnTo: our origins are kept, others fall back to the app's sign-in page.
	for returnTo, wantPrefix := range map[string]string{
		app + "/login":               app + "/login?verify=",
		"https://evil.example/phish": "http://localhost:5173/login?verify=",
	} {
		other := "return-" + randomSuffix() + "@example.com"
		request(h, "POST", "/v1/auth/email", "192.0.2.5:1", headers, `{"email":"`+other+`","returnTo":"`+returnTo+`"}`)

		if !strings.HasPrefix(mailer.link, wantPrefix) {
			t.Fatalf("returnTo %s → link %s", returnTo, mailer.link)
		}
	}

	// Wrong codes tell how many tries are left.
	wrongEmail := "wrong-" + randomSuffix() + "@example.com"
	request(h, "POST", "/v1/auth/email", "192.0.2.6:1", headers, `{"email":"`+wrongEmail+`"}`)

	wrong := "000000"
	if mailer.code == wrong {
		wrong = "000001"
	}

	if rec := request(h, "POST", "/v1/auth/email/verify", "192.0.2.6:1", headers, `{"email":"`+wrongEmail+`","code":"`+wrong+`"}`); !strings.Contains(rec.Body.String(), `"attemptsLeft":4`) {
		t.Fatalf("wrong code: %s", rec.Body.String())
	}

	// Native app, through the email link: the token comes in the body (no cookie) and works as Bearer.
	nativeEmail := "native-" + randomSuffix() + "@example.com"
	native := map[string]string{"Content-Type": "application/json"}

	if rec := request(h, "POST", "/v1/auth/email", "192.0.2.4:1", native, `{"email":"`+nativeEmail+`"}`); rec.Code != http.StatusAccepted {
		t.Fatalf("native request: %d", rec.Code)
	}

	link, _ := url.Parse(mailer.link)
	rec = request(h, "POST", "/v1/auth/email/verify", "192.0.2.4:1", native, `{"token":"`+link.Query().Get("verify")+`","client":"native"}`)

	var verified struct{ Token string }
	if err := json.Unmarshal(rec.Body.Bytes(), &verified); err != nil || verified.Token == "" || len(rec.Result().Cookies()) != 0 {
		t.Fatalf("native verify: %d %s", rec.Code, rec.Body.String())
	}

	bearer := map[string]string{"Authorization": "Bearer " + verified.Token}
	if rec := request(h, "GET", "/v1/auth/session", "192.0.2.4:1", bearer, ""); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), nativeEmail) {
		t.Fatalf("bearer session: %d %s", rec.Code, rec.Body.String())
	}

	if strings.Contains(logs.String(), email) || strings.Contains(logs.String(), mailer.code) {
		t.Fatalf("email or code leaked into logs: %s", logs.String())
	}
}

func randomSuffix() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)

	return hex.EncodeToString(b)
}
