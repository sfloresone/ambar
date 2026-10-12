package mail

import (
	"bytes"
	"context"
	"io"
	"math/rand/v2"
	"net/http"
	"strconv"
	"time"
)

// statusKey carries a pointer where the transport records the last HTTP status, so classify can tell a
// rejection (4xx) from an outage (5xx): the SDK keeps only the provider's message.
type statusKey struct{}

// retryTransport retries transient failures (network errors, 5xx, 429) with exponential backoff and
// jitter. Only requests with an Idempotency-Key are retried: the provider dedupes them, so a retry can
// never deliver an email twice. It stops when the context's deadline can't fit the next wait.
type retryTransport struct {
	next      http.RoundTripper
	attempts  int
	baseDelay time.Duration
	// maxDelay caps a Retry-After we are willing to honor; longer waits fail fast as rate limited.
	maxDelay time.Duration
}

func (t *retryTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.Header.Get("Idempotency-Key") == "" || req.Body == nil {
		resp, err := t.next.RoundTrip(req)
		record(req, resp)

		return resp, err
	}

	// The SDK's body can't be rewound (no GetBody): keep a copy for every attempt. It is small JSON.
	body, err := io.ReadAll(req.Body)
	_ = req.Body.Close()

	if err != nil {
		return nil, err
	}

	for attempt := 1; ; attempt++ {
		try := req.Clone(req.Context())
		try.Body = io.NopCloser(bytes.NewReader(body))
		try.ContentLength = int64(len(body))

		resp, err := t.next.RoundTrip(try)
		record(req, resp)

		wait, retry := t.backoff(resp, err, attempt)
		if !retry || !fits(req.Context(), wait) {
			return resp, err
		}

		if resp != nil {
			_, _ = io.Copy(io.Discard, resp.Body)
			_ = resp.Body.Close()
		}

		timer := time.NewTimer(wait)
		select {
		case <-req.Context().Done():
			timer.Stop()

			return nil, req.Context().Err()
		case <-timer.C:
		}
	}
}

// backoff decides whether attempt failed transiently and how long to wait before the next one.
func (t *retryTransport) backoff(resp *http.Response, err error, attempt int) (time.Duration, bool) {
	if attempt >= t.attempts {
		return 0, false
	}

	switch {
	case err != nil:
		// Network failure. If the context ended, fits() stops us.
	case resp.StatusCode == http.StatusTooManyRequests:
		if seconds, convErr := strconv.Atoi(resp.Header.Get("Retry-After")); convErr == nil {
			wait := time.Duration(seconds) * time.Second

			return wait, wait <= t.maxDelay
		}
	case resp.StatusCode >= 500:
	default:
		return 0, false
	}

	exponential := t.baseDelay << (attempt - 1)

	return exponential + rand.N(t.baseDelay), true
}

// record notes the response status for classify (see statusKey).
func record(req *http.Request, resp *http.Response) {
	if status, ok := req.Context().Value(statusKey{}).(*int); ok && resp != nil {
		*status = resp.StatusCode
	}
}

// fits: the wait leaves room before the context's deadline.
func fits(ctx context.Context, wait time.Duration) bool {
	deadline, ok := ctx.Deadline()

	return ctx.Err() == nil && (!ok || time.Until(deadline) > wait)
}
