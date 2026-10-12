package mail

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/resend/resend-go/v4"
)

const recipient = "victim@example.com"

// fakeResend answers each POST /emails with the next scripted response and records what it got.
type fakeResend struct {
	mu        sync.Mutex
	responses []func(http.ResponseWriter)
	keys      []string
	bodies    []string
}

func (f *fakeResend) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)

	f.mu.Lock()
	f.keys = append(f.keys, r.Header.Get("Idempotency-Key"))
	f.bodies = append(f.bodies, string(body))
	respond := f.responses[min(len(f.keys), len(f.responses))-1]
	f.mu.Unlock()

	respond(w)
}

func (f *fakeResend) calls() int {
	f.mu.Lock()
	defer f.mu.Unlock()

	return len(f.keys)
}

func status(code int, body string, headers ...string) func(http.ResponseWriter) {
	return func(w http.ResponseWriter) {
		for i := 0; i+1 < len(headers); i += 2 {
			w.Header().Set(headers[i], headers[i+1])
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(code)
		_, _ = io.WriteString(w, body)
	}
}

var ok = status(http.StatusOK, `{"id":"email_123"}`)

func newTestResend(t *testing.T, fake *fakeResend) *Resend {
	t.Helper()

	server := httptest.NewServer(fake)
	t.Cleanup(server.Close)

	transport := &retryTransport{next: http.DefaultTransport, attempts: 3, baseDelay: time.Millisecond, maxDelay: 50 * time.Millisecond}
	client := resend.NewCustomClient(&http.Client{Transport: transport}, "re_test")
	client.BaseURL, _ = url.Parse(server.URL + "/")

	return &Resend{client: client, from: "Ambar <hello@example.com>"}
}

func send(r *Resend) error {
	return r.SendSignIn(context.Background(), recipient, "123456", "https://app.example/login?verify=t", "challenge-1")
}

func TestTransientFailuresAreRetriedWithTheSameKey(t *testing.T) {
	fake := &fakeResend{responses: []func(http.ResponseWriter){
		status(http.StatusInternalServerError, `{"message":"boom"}`),
		status(http.StatusBadGateway, `{"message":"boom"}`),
		ok,
	}}

	if err := send(newTestResend(t, fake)); err != nil {
		t.Fatal(err)
	}

	if fake.calls() != 3 {
		t.Fatalf("calls: %d", fake.calls())
	}

	for _, key := range fake.keys {
		if key != "sign-in/challenge-1" {
			t.Fatalf("idempotency keys: %v", fake.keys)
		}
	}

	// Every attempt carried the full body.
	for _, body := range fake.bodies {
		if !strings.Contains(body, recipient) || !strings.Contains(body, `"sign_in"`) || !strings.Contains(body, "X-Entity-Ref-ID") {
			t.Fatalf("body: %s", body)
		}
	}
}

func TestRateLimitHonorsShortRetryAfter(t *testing.T) {
	fake := &fakeResend{responses: []func(http.ResponseWriter){
		status(http.StatusTooManyRequests, `{"message":"slow down"}`, "Retry-After", "0"),
		ok,
	}}

	if err := send(newTestResend(t, fake)); err != nil || fake.calls() != 2 {
		t.Fatalf("err %v, calls %d", err, fake.calls())
	}
}

func TestLongRetryAfterFailsFastAsRateLimited(t *testing.T) {
	fake := &fakeResend{responses: []func(http.ResponseWriter){
		status(http.StatusTooManyRequests, `{"message":"slow down"}`, "Retry-After", "60"),
	}}

	if err := send(newTestResend(t, fake)); !errors.Is(err, ErrRateLimited) || fake.calls() != 1 {
		t.Fatalf("err %v, calls %d", err, fake.calls())
	}
}

func TestRejectionIsNotRetriedAndHidesTheProviderMessage(t *testing.T) {
	fake := &fakeResend{responses: []func(http.ResponseWriter){
		status(http.StatusUnprocessableEntity, `{"statusCode":422,"name":"validation_error","message":"Invalid to field: `+recipient+`"}`),
	}}

	err := send(newTestResend(t, fake))
	if !errors.Is(err, ErrRejected) || fake.calls() != 1 {
		t.Fatalf("err %v, calls %d", err, fake.calls())
	}

	if strings.Contains(err.Error(), recipient) {
		t.Fatalf("recipient leaked: %v", err)
	}
}

func TestOutageGivesUpAfterTheAttempts(t *testing.T) {
	fake := &fakeResend{responses: []func(http.ResponseWriter){status(http.StatusServiceUnavailable, `{"message":"down"}`)}}

	if err := send(newTestResend(t, fake)); !errors.Is(err, ErrUnavailable) || fake.calls() != 3 {
		t.Fatalf("err %v, calls %d", err, fake.calls())
	}
}

func TestSlowProviderHitsTheBudget(t *testing.T) {
	release := make(chan struct{})
	fake := &fakeResend{responses: []func(http.ResponseWriter){func(w http.ResponseWriter) { <-release }}}
	r := newTestResend(t, fake)
	// Registered after the server: cleanups run last-in first-out, so the handler is released before
	// server.Close waits for it.
	t.Cleanup(func() { close(release) })

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	start := time.Now()
	err := r.SendSignIn(ctx, recipient, "123456", "https://app.example/login?verify=t", "challenge-1")

	if !errors.Is(err, ErrUnavailable) || time.Since(start) > 2*time.Second {
		t.Fatalf("err %v after %v", err, time.Since(start))
	}
}
