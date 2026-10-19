package main

import (
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/oauth2"

	"ambar/api/oauth"
)

// The attempt's cookie: which provider, the state, the PKCE verifier and where to land. __Host- in
// production, like the session cookie. SameSite=Lax: the provider sends the browser back with a top-level
// GET, which carries it.
const (
	oauthCookie       = "oauth"
	secureOAuthCookie = "__Host-" + oauthCookie
	// oauthTTL matches the providers' code lifetime.
	oauthTTL = 10 * time.Minute
)

// Sign-in errors the callback sends the browser back with (APP_URL/login?error=…). Listed in
// docs/reference/errors.md.
const (
	oauthCancelled = "oauth-cancelled"
	oauthState     = "oauth-state"
	oauthEmail     = "oauth-email"
	oauthFailed    = "oauth-failed"
)

// GET /v1/auth/oauth/{provider}?returnTo=… → 302 to the provider's consent page.
func (a *api) handleOAuthStart(w http.ResponseWriter, r *http.Request) {
	provider, ok := a.providers[chi.URLParam(r, "provider")]
	if !ok {
		writeProblem(w, r, http.StatusNotFound, "provider-unavailable", "That sign-in option isn't available.")

		return
	}

	// GenerateVerifier is 32 random bytes, base64url: the PKCE verifier and, separately, the state.
	state, verifier := oauth2.GenerateVerifier(), oauth2.GenerateVerifier()
	returnTo := a.allowedReturnTo(r.URL.Query().Get("returnTo"))

	a.setOAuthCookie(w, strings.Join([]string{provider.Name, state, verifier, base64.RawURLEncoding.EncodeToString([]byte(returnTo))}, "."), oauthTTL)
	redirect(w, provider.AuthURL(state, verifier))
}

// GET /v1/auth/oauth/{provider}/callback?code&state (or ?error) → 302 to returnTo signed in, or to the app's
// sign-in page with ?error=.
func (a *api) handleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "provider")
	query := r.URL.Query()

	// Used once, whatever happens next.
	attempt, found := a.readOAuthCookie(r)
	a.setOAuthCookie(w, "", 0)

	provider, ok := a.providers[name]
	if !ok {
		writeProblem(w, r, http.StatusNotFound, "provider-unavailable", "That sign-in option isn't available.")

		return
	}

	if !found || attempt.provider != name || subtle.ConstantTimeCompare([]byte(attempt.state), []byte(query.Get("state"))) != 1 {
		a.oauthFailed(w, r, name, oauthState, errors.New("missing, expired or mismatched state"))

		return
	}

	if code := query.Get("error"); code != "" {
		if err := oauth.AuthorizeError(code); err != nil {
			a.oauthFailed(w, r, name, oauthFailed, err)
		} else {
			a.redirectWithError(w, oauthCancelled)
		}

		return
	}

	identity, err := provider.Identify(r.Context(), query.Get("code"), attempt.verifier)
	if errors.Is(err, oauth.ErrNoVerifiedEmail) {
		a.oauthFailed(w, r, name, oauthEmail, err)

		return
	}

	if err != nil {
		a.oauthFailed(w, r, name, oauthFailed, err)

		return
	}

	verified, err := a.auth.SignInWithProvider(r.Context(), identity.Provider, identity.Subject, identity.Email, r.UserAgent())
	if err != nil {
		a.oauthFailed(w, r, name, oauthFailed, err)

		return
	}

	slog.InfoContext(r.Context(), "signed in", "event", "auth.signed_in", "user_id", verified.Session.UserID, "created", verified.Created, "method", name)

	a.setSessionCookie(w, verified.Token, verified.Session.ExpiresAt)

	destination := attempt.returnTo
	if destination == "" {
		destination = a.appURL + "/"
	}

	redirect(w, destination)
}

// oauthFailed logs why (the error never carries tokens, codes or the provider's text) and sends the
// browser back to sign in.
func (a *api) oauthFailed(w http.ResponseWriter, r *http.Request, provider, code string, err error) {
	// The person's side (stale tab, no verified email) is a warning; the provider or our config, an error.
	level := slog.LevelWarn
	if code == oauthFailed {
		level = slog.LevelError
	}

	slog.Log(r.Context(), level, "oauth sign-in failed", "event", "auth.oauth_failed", "provider", provider, "reason", code, "err", err)
	a.redirectWithError(w, code)
}

func (a *api) redirectWithError(w http.ResponseWriter, code string) {
	redirect(w, a.appURL+"/login?error="+url.QueryEscape(code))
}

// redirect is a bare 302: no HTML body (http.Redirect writes one), the browser only needs Location.
func redirect(w http.ResponseWriter, location string) {
	w.Header().Set("Location", location)
	w.WriteHeader(http.StatusFound)
}

type oauthAttempt struct{ provider, state, verifier, returnTo string }

func (a *api) readOAuthCookie(r *http.Request) (oauthAttempt, bool) {
	cookie, err := r.Cookie(a.oauthCookieName())
	if err != nil {
		return oauthAttempt{}, false
	}

	parts := strings.Split(cookie.Value, ".")
	if len(parts) != 4 || parts[1] == "" || parts[2] == "" {
		return oauthAttempt{}, false
	}

	returnTo, err := base64.RawURLEncoding.DecodeString(parts[3])
	if err != nil {
		return oauthAttempt{}, false
	}

	// Checked again: the cookie is ours (HttpOnly, __Host-), but the destination must never be anyone else's.
	return oauthAttempt{provider: parts[0], state: parts[1], verifier: parts[2], returnTo: a.allowedReturnTo(string(returnTo))}, true
}

// setOAuthCookie writes the attempt, or clears it with an empty value.
func (a *api) setOAuthCookie(w http.ResponseWriter, value string, ttl time.Duration) {
	cookie := &http.Cookie{
		Name:     a.oauthCookieName(),
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   a.secureCookie,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(ttl.Seconds()),
	}

	if value == "" {
		cookie.MaxAge = -1
	}

	http.SetCookie(w, cookie)
}

func (a *api) oauthCookieName() string {
	if a.secureCookie {
		return secureOAuthCookie
	}

	return oauthCookie
}
