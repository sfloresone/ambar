// Package auth is passwordless sign-in: an email with a 6-digit code and a link, both from one
// challenge, then a stateful session per device. Sign up and sign in are the same flow: the user row is
// created the first time an email is verified. The rules (cooldowns, attempts, expiry) live here; HTTP
// lives in the handlers, SQL in store.go.
package auth

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	codeTTL = 10 * time.Minute
	// resendCooldown: asking again sooner returns the current challenge without sending another email.
	resendCooldown = 30 * time.Second
	// maxEmailsPerHour per address, so nobody can flood someone's inbox.
	maxEmailsPerHour = 5
	// maxAttempts wrong codes burn the challenge: 10^6 codes, 5 guesses.
	maxAttempts = 5
	// SessionTTL is renewed (sliding) at most once a day while the session is used.
	SessionTTL     = 30 * 24 * time.Hour
	sessionRefresh = 24 * time.Hour
	// sessionMaxAge caps the sliding: after it, the device must sign in again, even if used daily.
	sessionMaxAge = 90 * 24 * time.Hour
)

var (
	ErrInvalidEmail = errors.New("invalid email")
	ErrInvalidCode  = errors.New("invalid code")
	// ErrTooManyAttempts: the challenge burned after maxAttempts wrong codes; a new email is needed.
	ErrTooManyAttempts = errors.New("too many wrong codes")
	// ErrExpired covers expired and already used challenges: the user needs a new email either way.
	ErrExpired     = errors.New("expired or used")
	ErrRateLimited = errors.New("too many emails")
	// ErrUnavailable: the email could not be sent; nothing was kept, so a retry sends a fresh one.
	ErrUnavailable = errors.New("email provider unavailable")
	ErrNoSession   = errors.New("no session")
	// ErrIdentityTaken: that provider account already signs in to another Ambar account.
	ErrIdentityTaken = errors.New("identity linked to another account")
	// ErrProviderLinked: this account already has an account at that provider.
	ErrProviderLinked = errors.New("provider already linked")
)

// Mailer sends the sign-in email. key makes retries idempotent at the provider.
type Mailer interface {
	SendSignIn(ctx context.Context, to, code, link, key string) error
}

// InvalidCodeError is ErrInvalidCode with how many tries the challenge has left.
type InvalidCodeError struct{ AttemptsLeft int }

func (e InvalidCodeError) Error() string {
	return fmt.Sprintf("invalid code (%d left)", e.AttemptsLeft)
}
func (e InvalidCodeError) Is(target error) bool { return target == ErrInvalidCode }

// RateLimitedError is ErrRateLimited with when the next email is allowed.
type RateLimitedError struct{ RetryAfter time.Duration }

func (e RateLimitedError) Error() string {
	return fmt.Sprintf("too many emails (retry in %s)", e.RetryAfter)
}
func (e RateLimitedError) Is(target error) bool { return target == ErrRateLimited }

type Service struct {
	store  store
	mailer Mailer
	secret []byte
	// defaultLink is where the email link points when the request doesn't say: the app's sign-in page.
	defaultLink string
}

// NewService: secret keys the code hashes (HMAC), appURL is the app that receives the link.
func NewService(db *pgxpool.Pool, mailer Mailer, secret []byte, appURL string) *Service {
	return &Service{store: store{db: db}, mailer: mailer, secret: secret, defaultLink: strings.TrimSuffix(appURL, "/") + "/login"}
}

// Pending is what the client shows while the user checks their inbox.
type Pending struct {
	Email       string
	ExpiresAt   time.Time
	ResendAfter time.Duration
}

// RequestEmail starts (or continues) a sign-in for email. returnTo is the page the email link opens (where the flow started, so it finds what the user attached there),
// already checked against the allowed origins by the caller; empty means the app's sign-in page.
// The answer never reveals whether an account exists.
func (s *Service) RequestEmail(ctx context.Context, email, returnTo string) (Pending, error) {
	email = NormalizeEmail(email)
	if !plausibleEmail.MatchString(email) {
		return Pending{}, ErrInvalidEmail
	}

	code, err := newCode()
	if err != nil {
		return Pending{}, err
	}

	token, err := newToken()
	if err != nil {
		return Pending{}, err
	}

	tokenHash := hashToken(token)

	result, err := s.store.startChallenge(ctx, startChallenge{
		email:     email,
		codeHash:  hashCode(s.secret, tokenHash, code),
		tokenHash: tokenHash,
	})
	if err != nil {
		return Pending{}, err
	}

	if result.reused {
		return Pending{Email: email, ExpiresAt: result.expiresAt, ResendAfter: result.resendAfter}, nil
	}

	if err := s.mailer.SendSignIn(ctx, email, code, s.link(returnTo, token), result.id); err != nil {
		// Forget it: the user never got it, and a retry must not wait for a cooldown.
		_ = s.store.deleteChallenge(context.WithoutCancel(ctx), result.id)

		return Pending{}, errors.Join(ErrUnavailable, err)
	}

	return Pending{Email: email, ExpiresAt: result.expiresAt, ResendAfter: resendCooldown}, nil
}

// Session is a signed-in device.
type Session struct {
	UserID    string
	Email     string
	ExpiresAt time.Time
}

// link is the sign-in URL in the email: returnTo (or the default) with the token as ?verify=.
func (s *Service) link(returnTo, token string) string {
	base := returnTo
	if base == "" {
		base = s.defaultLink
	}

	u, err := url.Parse(base)
	if err != nil {
		u, _ = url.Parse(s.defaultLink)
	}

	query := u.Query()
	query.Set("verify", token)
	u.RawQuery = query.Encode()

	return u.String()
}

// Verified is the result of a successful sign-in. Token goes to the device (cookie or keychain) once.
// Created: this sign-in created the account (sign up), so the client can welcome a new user.
type Verified struct {
	Session Session
	Token   string
	Created bool
}

// VerifyCode signs in with the 6-digit code typed by the user.
func (s *Service) VerifyCode(ctx context.Context, email, code, userAgent string) (Verified, error) {
	return s.signIn(ctx, checkCode(NormalizeEmail(email), func(tokenHash, codeHash []byte) bool {
		return equalHash(hashCode(s.secret, tokenHash, code), codeHash)
	}), userAgent)
}

// VerifyLink signs in with the token from the email link (POSTed by the app's page, never by a GET:
// mail scanners prefetch links).
func (s *Service) VerifyLink(ctx context.Context, token, userAgent string) (Verified, error) {
	return s.signIn(ctx, consumeToken(hashToken(token)), userAgent)
}

func (s *Service) signIn(ctx context.Context, consume check, userAgent string) (Verified, error) {
	token, err := newToken()
	if err != nil {
		return Verified{}, err
	}

	session, created, err := s.store.signIn(ctx, consume, hashToken(token), userAgent)
	if err != nil {
		return Verified{}, err
	}

	return Verified{Session: session, Token: token, Created: created}, nil
}

// SignInWithProvider signs in someone a provider (Google, GitHub) vouched for: subject is the provider's
// stable id, email one the provider verified. Linking by that email keeps one account per person.
func (s *Service) SignInWithProvider(ctx context.Context, provider, subject, email, userAgent string) (Verified, error) {
	email = NormalizeEmail(email)
	if subject == "" || !plausibleEmail.MatchString(email) {
		return Verified{}, ErrInvalidEmail
	}

	token, err := newToken()
	if err != nil {
		return Verified{}, err
	}

	session, created, err := s.store.signInIdentity(ctx, provider, subject, email, hashToken(token), userAgent)
	if err != nil {
		return Verified{}, err
	}

	return Verified{Session: session, Token: token, Created: created}, nil
}

// Identity is a provider account that signs in to a user: shown in Settings as a sign-in method.
type Identity struct {
	Provider string
	Email    string
	LinkedAt time.Time
}

// Identities lists the provider accounts that sign in to the user, by provider.
func (s *Service) Identities(ctx context.Context, userID string) ([]Identity, error) {
	return s.store.identities(ctx, userID)
}

// LinkIdentity connects a provider account to a signed-in user (Settings → Connect). Linking the same one
// again is a no-op; one that opens another account is ErrIdentityTaken.
func (s *Service) LinkIdentity(ctx context.Context, userID, provider, subject, email string) error {
	if subject == "" {
		return ErrInvalidEmail
	}

	return s.store.linkIdentity(ctx, userID, provider, subject, NormalizeEmail(email))
}

// UnlinkIdentity disconnects the user's account at provider. Email codes keep working, so it never locks
// anyone out.
func (s *Service) UnlinkIdentity(ctx context.Context, userID, provider string) error {
	return s.store.unlinkIdentity(ctx, userID, provider)
}

// Session is the live session for token, renewed if it is due. ErrNoSession when missing, expired or
// revoked.
func (s *Service) Session(ctx context.Context, token string) (Session, error) {
	if token == "" {
		return Session{}, ErrNoSession
	}

	return s.store.session(ctx, hashToken(token))
}

// SignOut revokes this device's session. Other devices stay signed in.
func (s *Service) SignOut(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}

	return s.store.revokeSession(ctx, hashToken(token))
}

// CleanupEvery is how often Cleanup should run.
const CleanupEvery = time.Hour

// Cleanup deletes old challenges and dead sessions, so the auth tables don't grow forever.
func (s *Service) Cleanup(ctx context.Context) (challenges, sessions int64, err error) {
	return s.store.deleteExpired(ctx)
}

// NormalizeEmail matches normalizeEmail in @ambar/core.
func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// Deliberately loose, like @ambar/core: receiving the email is the real check.
var plausibleEmail = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
