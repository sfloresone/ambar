package main

import (
	"net/http"
	"regexp"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

// Routes anyone may call. Every other route must answer 401 without a session, so a new endpoint is
// private unless it is added here on purpose (routes.go: the authenticated group).
var publicRoutes = map[string]bool{
	"GET /healthz":                           true,
	"POST /v1/auth/email":                    true,
	"POST /v1/auth/email/verify":             true,
	"GET /v1/auth/session":                   true,
	"DELETE /v1/auth/session":                true,
	"GET /v1/auth/providers":                 true,
	"GET /v1/auth/oauth/{provider}":          true,
	"GET /v1/auth/oauth/{provider}/callback": true,
}

var routeParam = regexp.MustCompile(`\{[^}]+\}`)

func TestPrivateByDefault(t *testing.T) {
	h := newOAuthAPI(t, nil, nil)
	seen := map[string]bool{}

	err := chi.Walk(newRouter(&api{allowedOrigins: []string{app}}).(chi.Routes), func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		key := method + " " + strings.TrimSuffix(route, "/")
		seen[key] = true

		if publicRoutes[key] {
			return nil
		}

		rec := request(h, method, routeParam.ReplaceAllString(route, "x"), "192.0.2.40:1", map[string]string{"Origin": app}, "")
		if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), `"unauthorized"`) {
			t.Errorf("%s without a session: %d %s (private routes go in the authenticated group)", key, rec.Code, rec.Body.String())
		}

		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	// The allowlist stays honest: no entry for a route that no longer exists.
	for key := range publicRoutes {
		if !seen[key] {
			t.Errorf("publicRoutes lists %s, which isn't routed", key)
		}
	}
}
