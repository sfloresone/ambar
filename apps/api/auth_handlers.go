package main

import (
	"encoding/json"
	"errors"
	"log/slog"
	"mime"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"ambar/api/auth"
)

// The session cookie. In production it carries the __Host- prefix: browsers then only accept it
// Secure, host-only (no Domain) and on Path=/, so no other subdomain can set or overwrite it.
const (
	sessionCookie       = "session"
	secureSessionCookie = "__Host-" + sessionCookie
)

// The API only takes small JSON bodies (emails, codes, tokens).
const maxBodyBytes = 8 << 10

type sessionJSON struct {
	UserID    string    `json:"userId"`
	Email     string    `json:"email"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func toJSON(s auth.Session) sessionJSON {
	return sessionJSON{UserID: s.UserID, Email: s.Email, ExpiresAt: s.ExpiresAt}
}

// POST /v1/auth/email {email, returnTo?} → 202 {email, expiresAt, resendAfterMs}
// returnTo is the page the email link opens (where the flow started); only allowed origins are kept.
func (a *api) handleRequestEmail(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		ReturnTo string `json:"returnTo"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}

	pending, err := a.auth.RequestEmail(r.Context(), body.Email, a.allowedReturnTo(body.ReturnTo))
	if err != nil {
		a.authError(w, r, err)

		return
	}

	writeJSON(w, http.StatusAccepted, map[string]any{
		"email":         pending.Email,
		"expiresAt":     pending.ExpiresAt,
		"resendAfterMs": pending.ResendAfter.Milliseconds(),
	})
}

// POST /v1/auth/email/verify {email, code} | {token}, client?: "web" | "native"
// → 200 {session, created, token?}. Web gets the session as an httpOnly cookie; native apps get the token
// once, to keep in the OS keychain, and send it as "Authorization: Bearer".
func (a *api) handleVerifyEmail(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email  string `json:"email"`
		Code   string `json:"code"`
		Token  string `json:"token"`
		Client string `json:"client"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}

	var (
		verified auth.Verified
		err      error
	)

	if body.Token != "" {
		verified, err = a.auth.VerifyLink(r.Context(), body.Token, r.UserAgent())
	} else {
		verified, err = a.auth.VerifyCode(r.Context(), body.Email, body.Code, r.UserAgent())
	}

	if err != nil {
		a.authError(w, r, err)

		return
	}

	slog.InfoContext(r.Context(), "signed in", "user_id", verified.Session.UserID, "via_link", body.Token != "")

	response := map[string]any{"session": toJSON(verified.Session), "created": verified.Created}

	if body.Client == "native" {
		response["token"] = verified.Token
	} else {
		a.setSessionCookie(w, verified.Token, verified.Session.ExpiresAt)
	}

	writeJSON(w, http.StatusOK, response)
}

// GET /v1/auth/session → 200 {session} | 401
func (a *api) handleGetSession(w http.ResponseWriter, r *http.Request) {
	token, fromCookie := a.sessionToken(r)

	session, err := a.auth.Session(r.Context(), token)
	if err != nil {
		a.authError(w, r, err)

		return
	}

	// Keep the cookie in step with the sliding expiry.
	if fromCookie {
		a.setSessionCookie(w, token, session.ExpiresAt)
	}

	writeJSON(w, http.StatusOK, map[string]any{"session": toJSON(session)})
}

// DELETE /v1/auth/session → 204. Only this device signs out.
func (a *api) handleSignOut(w http.ResponseWriter, r *http.Request) {
	token, _ := a.sessionToken(r)

	if err := a.auth.SignOut(r.Context(), token); err != nil {
		a.authError(w, r, err)

		return
	}

	a.setSessionCookie(w, "", time.Time{})
	w.WriteHeader(http.StatusNoContent)
}

// authError maps service errors to the API's status codes and AuthErrorCode values, with the details a
// client needs to guide the user (tries left, how long to wait).
func (a *api) authError(w http.ResponseWriter, r *http.Request, err error) {
	var (
		invalid InvalidCode
		limited RateLimited
	)

	switch {
	case errors.Is(err, auth.ErrInvalidEmail):
		writeError(w, http.StatusBadRequest, "invalid-email", "That doesn't look like an email address.")
	case errors.As(err, &invalid):
		writeErrorWith(w, http.StatusBadRequest, "invalid-code", "That code didn't work.", map[string]any{"attemptsLeft": invalid.AttemptsLeft})
	case errors.Is(err, auth.ErrTooManyAttempts):
		writeError(w, http.StatusBadRequest, "too-many-attempts", "Too many wrong codes. Get a new one.")
	case errors.Is(err, auth.ErrExpired):
		writeError(w, http.StatusBadRequest, "expired-code", "That code or link has expired. Request a new one.")
	case errors.As(err, &limited):
		writeErrorWith(w, http.StatusTooManyRequests, "rate-limited", "Too many emails for this address.", map[string]any{"retryAfterMs": limited.RetryAfter.Milliseconds()})
	case errors.Is(err, auth.ErrNoSession):
		writeError(w, http.StatusUnauthorized, "unauthorized", "You're not signed in.")
	case errors.Is(err, auth.ErrUnavailable):
		slog.ErrorContext(r.Context(), "sign-in email not sent", "err", err)
		writeError(w, http.StatusServiceUnavailable, "network", "We couldn't send the email. Try again in a moment.")
	default:
		slog.ErrorContext(r.Context(), "auth", "err", err)
		writeError(w, http.StatusInternalServerError, "internal", "Something went wrong on our side.")
	}
}

type (
	InvalidCode = auth.InvalidCodeError
	RateLimited = auth.RateLimitedError
)

// allowedReturnTo keeps returnTo only when it is an http(s) URL on one of our origins, so an email link
// can never point anywhere else. Empty means the service's default (the app's sign-in page).
func (a *api) allowedReturnTo(returnTo string) string {
	u, err := url.Parse(returnTo)
	if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.User != nil {
		return ""
	}

	if !slices.Contains(a.allowedOrigins, u.Scheme+"://"+u.Host) {
		return ""
	}

	u.Fragment = ""

	return u.String()
}

// setSessionCookie writes (or, with an empty token, clears) the session cookie. HttpOnly keeps it away
// from scripts; SameSite=Lax keeps other sites from using it in requests that change anything. It is
// host-only (the API's host): landing, app and API are same-site, so every one of them still sends it.
func (a *api) setSessionCookie(w http.ResponseWriter, token string, expires time.Time) {
	cookie := &http.Cookie{
		Name:     a.sessionCookieName(),
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   a.secureCookie,
		SameSite: http.SameSiteLaxMode,
		Expires:  expires,
	}

	if token == "" {
		cookie.MaxAge = -1
	}

	http.SetCookie(w, cookie)
}

// sessionCookieName: __Host- needs Secure, which plain-http development can't set.
func (a *api) sessionCookieName() string {
	if a.secureCookie {
		return secureSessionCookie
	}

	return sessionCookie
}

// sessionToken reads "Authorization: Bearer" (native apps) or the cookie (web).
func (a *api) sessionToken(r *http.Request) (token string, fromCookie bool) {
	if bearer, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer "); ok {
		return strings.TrimSpace(bearer), false
	}

	if cookie, err := r.Cookie(a.sessionCookieName()); err == nil {
		return cookie.Value, true
	}

	return "", false
}

// decodeJSON reads a small JSON body. Requiring application/json also means a cross-site form can't post
// here: browsers must send a CORS preflight first, which other origins fail.
func decodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	if mediaType, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type")); mediaType != "application/json" {
		writeError(w, http.StatusUnsupportedMediaType, "bad-request", "Send JSON.")

		return false
	}

	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, "bad-request", "That request doesn't look right.")

		return false
	}

	return true
}
