package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"maps"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"

	"ambar/api/auth"
	"ambar/api/oauth"
)

// pinger is what the health check needs from the database (the pgx pool, or a fake in tests).
type pinger interface {
	Ping(ctx context.Context) error
}

// api holds what the handlers need. Built once in main.
type api struct {
	logger         *slog.Logger
	db             pinger
	auth           *auth.Service
	providers      map[string]*oauth.Provider
	appURL         string
	allowedOrigins []string
	trustProxy     bool
	secureCookie   bool
}

// newRouter is the whole HTTP surface: middleware and every route, in one place.
func newRouter(a *api) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)

	if a.trustProxy {
		r.Use(realIP)
	}

	r.Use(requestLogger(a.logger))
	r.Use(chimw.Recoverer)
	r.Use(rateLimit(120, time.Minute))

	r.Get("/healthz", a.handleHealth)

	r.Route("/v1", func(r chi.Router) {
		r.Use(cors(a.allowedOrigins), originGuard(a.allowedOrigins), noStore)

		r.Route("/auth", func(r chi.Router) {
			// Tighter than the global limit: each request may send an email.
			r.With(rateLimit(20, time.Hour)).Post("/email", a.handleRequestEmail)
			r.With(rateLimit(60, time.Hour)).Post("/email/verify", a.handleVerifyEmail)
			r.Get("/session", a.handleGetSession)
			r.Delete("/session", a.handleSignOut)
			// Browser navigations, not fetches: the state cookie is the CSRF check (docs/decisions/0005).
			r.With(rateLimit(60, time.Hour)).Get("/oauth/{provider}", a.handleOAuthStart)
			r.With(rateLimit(60, time.Hour)).Get("/oauth/{provider}/callback", a.handleOAuthCallback)
		})
	})

	return r
}

// handleHealth answers 200 when the API and its database are up, 503 when the database is not.
func (a *api) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	status, body := http.StatusOK, "ok"

	if err := a.db.Ping(ctx); err != nil {
		slog.WarnContext(r.Context(), "health: database unreachable", "err", err)
		status, body = http.StatusServiceUnavailable, "database unreachable"
	}

	writeJSON(w, status, map[string]string{"status": body})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// problemTypeBase prefixes the error code to form the problem "type" URI (RFC 9457).
const problemTypeBase = "https://docs.ambar.page/errors/"

// writeProblem is the one error shape: an RFC 9457 problem document (application/problem+json) with
// a stable "code" and the request ID. Codes are listed in docs/reference/errors.md and match
// AuthErrorCode in @ambar/core; detail is for people and never carries internal text.
func writeProblem(w http.ResponseWriter, r *http.Request, status int, code, detail string) {
	writeProblemWith(w, r, status, code, detail, nil)
}

// writeProblemWith adds extension members to the problem (e.g. attemptsLeft, retryAfterMs).
func writeProblemWith(w http.ResponseWriter, r *http.Request, status int, code, detail string, extensions map[string]any) {
	body := map[string]any{
		"type":      problemTypeBase + code,
		"title":     problemTitle(code),
		"status":    status,
		"detail":    detail,
		"code":      code,
		"requestId": chimw.GetReqID(r.Context()),
	}
	maps.Copy(body, extensions)

	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// problemTitle turns "invalid-code" into "Invalid code": one fixed title per code.
func problemTitle(code string) string {
	return strings.ToUpper(code[:1]) + strings.ReplaceAll(code[1:], "-", " ")
}

// rateLimit caps requests per client IP (IPv6 per /64, the block one user usually holds).
func rateLimit(requests int, window time.Duration) func(http.Handler) http.Handler {
	return httprate.LimitBy(requests, window, func(r *http.Request) (string, error) {
		return httprate.CanonicalizeIP(clientIP(r)), nil
	}, httprate.WithLimitHandler(func(w http.ResponseWriter, r *http.Request) {
		// httprate has already set Retry-After (seconds); repeat it in the body for clients.
		seconds, _ := strconv.Atoi(w.Header().Get("Retry-After"))
		writeProblemWith(w, r, http.StatusTooManyRequests, "rate-limited", "Too many attempts. Try again in a little while.", map[string]any{"retryAfterMs": seconds * 1000})
	}))
}
