package main

import (
	"log/slog"
	"net"
	"net/http"
	"net/netip"
	"slices"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

// requestLogger writes one line per request. It logs the route pattern ("/v1/moments/{id}"), never
// the raw path or query, so IDs, tokens and emails stay out of the logs.
func requestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(ww, r)

			status := ww.Status()
			level := slog.LevelInfo

			switch {
			case status >= 500:
				level = slog.LevelError
			case status >= 400:
				level = slog.LevelWarn
			}

			logger.Log(r.Context(), level, "request",
				"request_id", chimw.GetReqID(r.Context()),
				"method", r.Method,
				"route", chi.RouteContext(r.Context()).RoutePattern(),
				"status", status,
				"duration_ms", time.Since(start).Milliseconds(),
				"ip", clientIP(r),
			)
		})
	}
}

// realIP takes the client IP from X-Real-IP, which our reverse proxy must set (overwriting whatever the
// client sent). Only mounted with TRUST_PROXY=true. Not chi's RealIP: it also trusts True-Client-IP and
// the leftmost X-Forwarded-For entry, both client-controlled, which would let anyone dodge the rate limit.
func realIP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if ip, err := netip.ParseAddr(r.Header.Get("X-Real-IP")); err == nil {
			r.RemoteAddr = ip.String()
		}

		next.ServeHTTP(w, r)
	})
}

// clientIP is the caller's IP: the TCP peer, or the proxy-reported one after realIP.
func clientIP(r *http.Request) string {
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}

	return r.RemoteAddr
}

// cors lets the listed browser origins (landing, app) call the API with credentials (the session
// cookie). Other origins get no CORS headers, so browsers refuse them.
func cors(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			h := w.Header()
			h.Add("Vary", "Origin")

			allowed := slices.Contains(allowedOrigins, origin)
			if allowed {
				h.Set("Access-Control-Allow-Origin", origin)
				h.Set("Access-Control-Allow-Credentials", "true")
			}

			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				if allowed {
					h.Set("Access-Control-Allow-Methods", "GET, POST, DELETE")
					h.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
					h.Set("Access-Control-Max-Age", "600")
				}

				w.WriteHeader(http.StatusNoContent)

				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// originGuard refuses state-changing requests sent by a browser from another site (CSRF). Requests
// without Origin (native apps, server-to-server) carry no cookie of ours to abuse and pass.
func originGuard(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			changes := r.Method != http.MethodGet && r.Method != http.MethodHead && r.Method != http.MethodOptions

			if changes && origin != "" && !slices.Contains(allowedOrigins, origin) {
				writeError(w, http.StatusForbidden, "forbidden", "Not allowed from this site.")

				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// noStore: API responses carry per-user data and must never be cached.
func noStore(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		next.ServeHTTP(w, r)
	})
}
