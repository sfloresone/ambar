// Package mail sends Ambar's emails: Resend in production, the console in development.
//
// Resend will fail sometimes (network, 5xx, rate limits, slowness). Sends are bounded in time, retried
// only when it is safe (idempotent requests, transient failures) and fail with our own errors, which never
// carry the provider's message (it can echo the recipient).
package mail

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"html/template"
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
	html, err := signInHTML(code, link)
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
		Subject: fmt.Sprintf("Your Ambar code: %s", code),
		Text:    signInText(code, link),
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

func signInText(code, link string) string {
	return fmt.Sprintf(`Your Ambar code is %s

Or open this link to sign in:
%s

It works once and expires in 10 minutes. If you didn't ask for it, you can ignore this email.
`, code, link)
}

var signInTemplate = template.Must(template.New("sign-in").Parse(`<!doctype html>
<html lang="en">
<body style="margin:0;padding:32px 16px;background:#ffffff;color:#141414;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:420px;margin:0 auto">
    <p style="font-size:16px;margin:0 0 16px">Your Ambar code is</p>
    <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 24px">{{.Code}}</p>
    <p style="margin:0 0 24px"><a href="{{.Link}}" style="display:inline-block;background:#141414;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">Sign in to Ambar</a></p>
    <p style="font-size:13px;color:#6b6b6b;margin:0">It works once and expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
  </div>
</body>
</html>`))

func signInHTML(code, link string) (string, error) {
	var b bytes.Buffer
	if err := signInTemplate.Execute(&b, struct{ Code, Link string }{code, link}); err != nil {
		return "", err
	}

	return b.String(), nil
}
