// Package mail sends Ambar's emails: Resend in production, the console in development.
//
// Resend will fail sometimes (network, 5xx, rate limits, slowness). Sends are bounded in time, retried
// only when it is safe (idempotent requests, transient failures) and fail with our own errors, which never
// carry the provider's message (it can echo the recipient).
package mail

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/resend/resend-go/v4"
)

// sendBudget caps a send, retries included, so a slow provider can't hold a sign-in request open.
const sendBudget = 10 * time.Second

var (
	// ErrRateLimited: Resend asked us to slow down and the wait didn't fit the budget.
	ErrRateLimited = errors.New("mail: provider rate limit")
	// ErrRejected: Resend refused the request (4xx): our configuration or the address. Not retried.
	ErrRejected = errors.New("mail: rejected by provider")
	// ErrUnavailable: network failure, provider error (5xx) or out of time.
	ErrUnavailable = errors.New("mail: provider unavailable")
)

// Resend sends through the Resend API.
type Resend struct {
	client *resend.Client
	from   string
}

func NewResend(apiKey, from string) *Resend {
	transport := &retryTransport{next: http.DefaultTransport, attempts: 3, baseDelay: 300 * time.Millisecond, maxDelay: 2 * time.Second}

	return &Resend{client: resend.NewCustomClient(&http.Client{Transport: transport}, apiKey), from: from}
}

// SendSignIn sends the code and the link. key (the challenge id) is the idempotency key: however many
// times the request is retried, Resend delivers it once.
func (r *Resend) SendSignIn(ctx context.Context, to, code, link, key string) error {
	html, text, err := renderSignIn(code, link)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, sendBudget)
	defer cancel()

	var status int
	ctx = context.WithValue(ctx, statusKey{}, &status)

	sent, err := r.client.Emails.SendWithOptions(ctx, &resend.SendEmailRequest{
		From:    r.from,
		To:      []string{to},
		Subject: "Your Ambar sign-in code",
		Text:    text,
		Html:    html,
		Tags:    []resend.Tag{{Name: "category", Value: "sign_in"}},
		// Keeps Gmail from threading every sign-in email into one conversation.
		Headers: map[string]string{"X-Entity-Ref-ID": key},
	}, &resend.SendEmailOptions{IdempotencyKey: "sign-in/" + key})
	if err != nil {
		failure := classify(ctx, err, status)
		slog.WarnContext(ctx, "sign-in email failed", "challenge_id", key, "status", status, "reason", failure)

		return failure
	}

	slog.InfoContext(ctx, "sign-in email sent", "challenge_id", key, "resend_id", sent.Id)

	return nil
}

// classify turns an SDK error into ours, by the last HTTP status the transport saw.
func classify(ctx context.Context, err error, status int) error {
	switch {
	case errors.Is(err, resend.ErrRateLimit):
		return ErrRateLimited
	case ctx.Err() != nil, status == 0, status >= 500:
		return ErrUnavailable
	case status >= 400:
		return ErrRejected
	default:
		return ErrUnavailable
	}
}

// Console prints the email instead of sending it. Development only: main refuses it in production.
type Console struct{}

func (Console) SendSignIn(ctx context.Context, to, code, link, _ string) error {
	slog.InfoContext(ctx, "dev mail: sign-in", "to", to, "code", code, "link", link)

	return nil
}
