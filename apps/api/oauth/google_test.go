package oauth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Google's identity is the userinfo answer: sub as the subject, and only a verified email.
func TestGoogleIdentity(t *testing.T) {
	answer := `{"sub":"1080","email":"ana@example.com","email_verified":true}`
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(answer)) }))
	t.Cleanup(api.Close)

	google := Google("id", "secret", "http://localhost:8080/cb", Endpoints{APIURL: api.URL})

	identity, err := google.identity(context.Background(), api.Client())
	if err != nil || identity != (Identity{Subject: "1080", Email: "ana@example.com"}) {
		t.Fatalf("verified: %+v %v", identity, err)
	}

	answer = `{"sub":"1080","email":"ana@example.com","email_verified":false}`
	if _, err := google.identity(context.Background(), api.Client()); !errors.Is(err, ErrNoVerifiedEmail) {
		t.Fatalf("unverified: %v", err)
	}
}
