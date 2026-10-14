package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"ambar/api/migrations"
)

// These tests run against a real Postgres (bun run --filter @ambar/api db:up). -short skips them.

type sentEmail struct{ to, code, link string }

type fakeMailer struct {
	mu   sync.Mutex
	sent []sentEmail
	fail error
}

func (m *fakeMailer) SendSignIn(_ context.Context, to, code, link, _ string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.fail != nil {
		return m.fail
	}

	m.sent = append(m.sent, sentEmail{to, code, link})

	return nil
}

func (m *fakeMailer) count() int {
	m.mu.Lock()
	defer m.mu.Unlock()

	return len(m.sent)
}

func (m *fakeMailer) last(t *testing.T) sentEmail {
	t.Helper()
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.sent) == 0 {
		t.Fatal("no email sent")
	}

	return m.sent[len(m.sent)-1]
}

func (e sentEmail) token(t *testing.T) string {
	t.Helper()

	u, err := url.Parse(e.link)
	if err != nil {
		t.Fatal(err)
	}

	return u.Query().Get("verify")
}

func testDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	if testing.Short() {
		t.Skip("needs Postgres")
	}

	url := os.Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://ambar:ambar@localhost:5432/ambar?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(pool.Close)

	if err := migrations.Up(context.Background(), pool); err != nil {
		t.Fatalf("Postgres not reachable or migrations failed (bun run --filter @ambar/api db:up): %v", err)
	}

	return pool
}

func newTestService(t *testing.T) (*Service, *fakeMailer, *pgxpool.Pool) {
	db := testDB(t)
	mailer := &fakeMailer{}

	return NewService(db, mailer, []byte("test-secret-test-secret-test-secret"), "http://localhost:5173"), mailer, db
}

func uniqueEmail() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)

	return "test-" + hex.EncodeToString(b) + "@example.com"
}

// age moves an email's challenges back in time, to step past the cooldown without sleeping.
func age(t *testing.T, db *pgxpool.Pool, email string, by time.Duration) {
	t.Helper()

	if _, err := db.Exec(context.Background(),
		`UPDATE email_challenges SET created_at = created_at - make_interval(secs => $2) WHERE email = $1`,
		email, by.Seconds()); err != nil {
		t.Fatal(err)
	}
}

func wrongCode(right string) string {
	if right == "000000" {
		return "000001"
	}

	return "000000"
}

func TestSignUpThenSignInWithCode(t *testing.T) {
	ctx := context.Background()
	s, mailer, db := newTestService(t)
	email := uniqueEmail()

	pending, err := s.RequestEmail(ctx, "  "+strings.ToUpper(email)+" ", "")
	if err != nil {
		t.Fatal(err)
	}

	if pending.Email != email || pending.ResendAfter != resendCooldown || time.Until(pending.ExpiresAt) < 9*time.Minute {
		t.Fatalf("pending: %+v", pending)
	}

	sent := mailer.last(t)
	if sent.to != email || len(sent.code) != 6 || !strings.HasPrefix(sent.link, "http://localhost:5173/login?verify=") {
		t.Fatalf("email: %+v", sent)
	}

	verified, err := s.VerifyCode(ctx, email, sent.code, "test-agent")
	if err != nil {
		t.Fatal(err)
	}

	if verified.Session.Email != email || verified.Token == "" || !verified.Created {
		t.Fatalf("verified: %+v", verified)
	}

	session, err := s.Session(ctx, verified.Token)
	if err != nil || session.UserID != verified.Session.UserID {
		t.Fatalf("session: %+v %v", session, err)
	}

	// Signing in again (another device): same user, a second, independent session.
	age(t, db, email, time.Minute)

	if _, err := s.RequestEmail(ctx, email, ""); err != nil {
		t.Fatal(err)
	}

	again, err := s.VerifyCode(ctx, email, mailer.last(t).code, "other-device")
	if err != nil || again.Session.UserID != verified.Session.UserID || again.Token == verified.Token || again.Created {
		t.Fatalf("second sign-in: %+v %v", again, err)
	}
}

func TestRequestInsideCooldownSendsNothing(t *testing.T) {
	ctx := context.Background()
	s, mailer, _ := newTestService(t)
	email := uniqueEmail()

	first, err := s.RequestEmail(ctx, email, "")
	if err != nil {
		t.Fatal(err)
	}

	second, err := s.RequestEmail(ctx, email, "")
	if err != nil {
		t.Fatal(err)
	}

	if mailer.count() != 1 || !second.ExpiresAt.Equal(first.ExpiresAt) || second.ResendAfter >= resendCooldown || second.ResendAfter <= 0 {
		t.Fatalf("emails %d, first %+v, second %+v", mailer.count(), first, second)
	}
}

func TestSimultaneousRequestsSendOneEmail(t *testing.T) {
	s, mailer, _ := newTestService(t)
	email := uniqueEmail()

	var wg sync.WaitGroup
	for range 5 {
		wg.Go(func() {
			if _, err := s.RequestEmail(context.Background(), email, ""); err != nil {
				t.Error(err)
			}
		})
	}

	wg.Wait()

	if mailer.count() != 1 {
		t.Fatalf("sent %d emails", mailer.count())
	}
}

func TestNewEmailRetiresTheOldOne(t *testing.T) {
	ctx := context.Background()
	s, mailer, db := newTestService(t)
	email := uniqueEmail()

	if _, err := s.RequestEmail(ctx, email, ""); err != nil {
		t.Fatal(err)
	}

	old := mailer.last(t)
	age(t, db, email, time.Minute)

	if _, err := s.RequestEmail(ctx, email, ""); err != nil {
		t.Fatal(err)
	}

	if _, err := s.VerifyLink(ctx, old.token(t), ""); !errors.Is(err, ErrExpired) {
		t.Fatalf("old link: %v", err)
	}

	if _, err := s.VerifyCode(ctx, email, mailer.last(t).code, ""); err != nil {
		t.Fatalf("new code: %v", err)
	}
}

func TestWrongCodesBurnTheChallenge(t *testing.T) {
	ctx := context.Background()
	s, mailer, _ := newTestService(t)
	email := uniqueEmail()

	if _, err := s.RequestEmail(ctx, email, ""); err != nil {
		t.Fatal(err)
	}

	right := mailer.last(t).code

	for i := 1; i < maxAttempts; i++ {
		_, err := s.VerifyCode(ctx, email, wrongCode(right), "")

		var invalid InvalidCodeError
		if !errors.As(err, &invalid) || !errors.Is(err, ErrInvalidCode) || invalid.AttemptsLeft != maxAttempts-i {
			t.Fatalf("attempt %d: %v", i, err)
		}
	}

	if _, err := s.VerifyCode(ctx, email, wrongCode(right), ""); !errors.Is(err, ErrTooManyAttempts) {
		t.Fatalf("last attempt should burn it: %v", err)
	}

	if _, err := s.VerifyCode(ctx, email, right, ""); !errors.Is(err, ErrExpired) {
		t.Fatalf("right code after burning: %v", err)
	}
}

func TestExpiredChallenge(t *testing.T) {
	ctx := context.Background()
	s, mailer, db := newTestService(t)
	email := uniqueEmail()

	if _, err := s.RequestEmail(ctx, email, ""); err != nil {
		t.Fatal(err)
	}

	if _, err := db.Exec(ctx, `UPDATE email_challenges SET expires_at = now() - interval '1 second' WHERE email = $1`, email); err != nil {
		t.Fatal(err)
	}

	if _, err := s.VerifyCode(ctx, email, mailer.last(t).code, ""); !errors.Is(err, ErrExpired) {
		t.Fatalf("code: %v", err)
	}

	if _, err := s.VerifyLink(ctx, mailer.last(t).token(t), ""); !errors.Is(err, ErrExpired) {
		t.Fatalf("link: %v", err)
	}
}

func TestLinkWorksOnceAndConsumesTheCode(t *testing.T) {
	ctx := context.Background()
	s, mailer, _ := newTestService(t)
	email := uniqueEmail()

	if _, err := s.RequestEmail(ctx, email, ""); err != nil {
		t.Fatal(err)
	}

	sent := mailer.last(t)

	verified, err := s.VerifyLink(ctx, sent.token(t), "phone")
	if err != nil || verified.Session.Email != email {
		t.Fatalf("link: %+v %v", verified, err)
	}

	if _, err := s.VerifyLink(ctx, sent.token(t), ""); !errors.Is(err, ErrExpired) {
		t.Fatalf("link reuse: %v", err)
	}

	if _, err := s.VerifyCode(ctx, email, sent.code, ""); !errors.Is(err, ErrExpired) {
		t.Fatalf("code after link: %v", err)
	}
}

func TestEmailsPerHourAreCapped(t *testing.T) {
	ctx := context.Background()
	s, mailer, db := newTestService(t)
	email := uniqueEmail()

	for i := range maxEmailsPerHour {
		if _, err := s.RequestEmail(ctx, email, ""); err != nil {
			t.Fatalf("email %d: %v", i+1, err)
		}

		age(t, db, email, time.Minute)
	}

	_, err := s.RequestEmail(ctx, email, "")

	var limited RateLimitedError
	if !errors.As(err, &limited) || !errors.Is(err, ErrRateLimited) {
		t.Fatalf("over the cap: %v (sent %d)", err, mailer.count())
	}

	// The oldest email was aged 5 minutes: the window frees up in about 55.
	if limited.RetryAfter < 54*time.Minute || limited.RetryAfter > 56*time.Minute {
		t.Fatalf("retry after %v", limited.RetryAfter)
	}
}

func TestProviderFailureKeepsNothing(t *testing.T) {
	ctx := context.Background()
	s, mailer, _ := newTestService(t)
	email := uniqueEmail()

	mailer.fail = errors.New("resend: 500")

	if _, err := s.RequestEmail(ctx, email, ""); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("got %v", err)
	}

	// No cooldown: the retry sends right away.
	mailer.fail = nil

	pending, err := s.RequestEmail(ctx, email, "")
	if err != nil || mailer.count() != 1 || pending.ResendAfter != resendCooldown {
		t.Fatalf("retry: %+v %v (sent %d)", pending, err, mailer.count())
	}
}

func TestSessionSlidesAndSignOutRevokes(t *testing.T) {
	ctx := context.Background()
	s, mailer, db := newTestService(t)
	email := uniqueEmail()

	if _, err := s.RequestEmail(ctx, email, ""); err != nil {
		t.Fatal(err)
	}

	verified, err := s.VerifyCode(ctx, email, mailer.last(t).code, "")
	if err != nil {
		t.Fatal(err)
	}

	// Last used two days ago, expiring soon: using it renews it to a full TTL.
	if _, err := db.Exec(ctx, `
		UPDATE sessions SET last_seen_at = now() - interval '2 days', expires_at = now() + interval '1 day'
		WHERE user_id = $1`, verified.Session.UserID); err != nil {
		t.Fatal(err)
	}

	session, err := s.Session(ctx, verified.Token)
	if err != nil || time.Until(session.ExpiresAt) < SessionTTL-time.Minute {
		t.Fatalf("renewed: %+v %v", session, err)
	}

	if err := s.SignOut(ctx, verified.Token); err != nil {
		t.Fatal(err)
	}

	if _, err := s.Session(ctx, verified.Token); !errors.Is(err, ErrNoSession) {
		t.Fatalf("after sign out: %v", err)
	}

	if _, err := s.Session(ctx, "not-a-token"); !errors.Is(err, ErrNoSession) {
		t.Fatalf("unknown token: %v", err)
	}
}

func TestSessionStopsSlidingAtMaxAge(t *testing.T) {
	ctx := context.Background()
	s, mailer, db := newTestService(t)
	email := uniqueEmail()

	if _, err := s.RequestEmail(ctx, email, ""); err != nil {
		t.Fatal(err)
	}

	verified, err := s.VerifyCode(ctx, email, mailer.last(t).code, "")
	if err != nil {
		t.Fatal(err)
	}

	// Signed in 89 days ago and used daily: the renewal stops at day 90, not 30 days from now.
	if _, err := db.Exec(ctx, `
		UPDATE sessions
		SET created_at = now() - interval '89 days', last_seen_at = now() - interval '2 days',
		    expires_at = now() + interval '1 day'
		WHERE user_id = $1`, verified.Session.UserID); err != nil {
		t.Fatal(err)
	}

	session, err := s.Session(ctx, verified.Token)
	if left := time.Until(session.ExpiresAt); err != nil || left > 24*time.Hour+time.Minute || left < 24*time.Hour-time.Minute {
		t.Fatalf("capped: %+v %v", session, err)
	}
}

// If opening the session fails, the sign-in rolls back whole: the link was not used up and still works.
func TestFailedSessionKeepsTheChallenge(t *testing.T) {
	ctx := context.Background()
	s, mailer, _ := newTestService(t)
	email := uniqueEmail()

	if _, err := s.RequestEmail(ctx, email, ""); err != nil {
		t.Fatal(err)
	}

	first, err := s.VerifyCode(ctx, email, mailer.last(t).code, "")
	if err != nil {
		t.Fatal(err)
	}

	other := uniqueEmail()
	if _, err := s.RequestEmail(ctx, other, ""); err != nil {
		t.Fatal(err)
	}

	link := hashToken(mailer.last(t).token(t))

	// Reusing an existing session's token hash makes the session insert fail (unique token_hash).
	if _, _, err := s.store.signIn(ctx, consumeToken(link), hashToken(first.Token), ""); err == nil {
		t.Fatal("want the session insert to fail")
	}

	verified, err := s.VerifyLink(ctx, mailer.last(t).token(t), "")
	if err != nil || verified.Session.Email != other || !verified.Created {
		t.Fatalf("link after failed sign-in: %+v %v", verified, err)
	}
}

func TestInvalidEmail(t *testing.T) {
	s, _, _ := newTestService(t)

	for _, email := range []string{"", "no-at", "a@b", "two words@example.com"} {
		if _, err := s.RequestEmail(context.Background(), email, ""); !errors.Is(err, ErrInvalidEmail) {
			t.Errorf("%q: %v", email, err)
		}
	}
}

func TestLinkReturnsWhereTheFlowStarted(t *testing.T) {
	ctx := context.Background()
	s, mailer, _ := newTestService(t)

	if _, err := s.RequestEmail(ctx, uniqueEmail(), "http://localhost:4321/?from=hero"); err != nil {
		t.Fatal(err)
	}

	link, err := url.Parse(mailer.last(t).link)
	if err != nil || link.Host != "localhost:4321" || link.Path != "/" || link.Query().Get("from") != "hero" || link.Query().Get("verify") == "" {
		t.Fatalf("link: %s (%v)", mailer.last(t).link, err)
	}
}

func TestCleanupKeepsOnlyRecentRows(t *testing.T) {
	ctx := context.Background()
	s, mailer, db := newTestService(t)
	old, recent := uniqueEmail(), uniqueEmail()
	userIDs := map[string]string{}

	for _, email := range []string{old, recent} {
		if _, err := s.RequestEmail(ctx, email, ""); err != nil {
			t.Fatal(err)
		}

		verified, err := s.VerifyCode(ctx, email, mailer.last(t).code, "")
		if err != nil {
			t.Fatal(err)
		}

		userIDs[email] = verified.Session.UserID
	}

	age(t, db, old, 2*24*time.Hour)

	if _, err := db.Exec(ctx, `UPDATE sessions SET revoked_at = now() - interval '2 days' WHERE user_id = $1`, userIDs[old]); err != nil {
		t.Fatal(err)
	}

	if _, _, err := s.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}

	count := func(query, arg string) int {
		var n int
		if err := db.QueryRow(ctx, query, arg).Scan(&n); err != nil {
			t.Fatal(err)
		}

		return n
	}

	challenges := `SELECT count(*) FROM email_challenges WHERE email = $1`
	sessions := `SELECT count(*) FROM sessions WHERE user_id = $1`

	if count(challenges, old) != 0 || count(sessions, userIDs[old]) != 0 {
		t.Fatal("old rows survived cleanup")
	}

	if count(challenges, recent) != 1 || count(sessions, userIDs[recent]) != 1 {
		t.Fatal("cleanup removed recent rows")
	}
}
