package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// store is the SQL for the auth tables (migrations/00001_auth.sql). Time comes from the database
// (now()), so every rule uses one clock.
type store struct {
	db *pgxpool.Pool
}

type startChallenge struct {
	email     string
	codeHash  []byte
	tokenHash []byte
	next      string
}

type startResult struct {
	id          string
	reused      bool
	expiresAt   time.Time
	resendAfter time.Duration
}

// startChallenge reuses the live challenge inside the cooldown, or replaces it with a new one.
// Serialized per email (advisory lock), so two simultaneous requests never send two emails.
func (s store) startChallenge(ctx context.Context, in startChallenge) (startResult, error) {
	var result startResult

	err := pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, in.email); err != nil {
			return err
		}

		var age float64

		err := tx.QueryRow(ctx, `
			SELECT id::text, expires_at, extract(epoch FROM now() - created_at)
			FROM email_challenges
			WHERE email = $1 AND consumed_at IS NULL AND expires_at > now()
			ORDER BY created_at DESC LIMIT 1`, in.email).Scan(&result.id, &result.expiresAt, &age)

		switch {
		case err == nil && age < resendCooldown.Seconds():
			result.reused = true
			result.resendAfter = resendCooldown - time.Duration(age*float64(time.Second))

			return nil
		case err != nil && !errors.Is(err, pgx.ErrNoRows):
			return err
		}

		var (
			sentLastHour int
			// Seconds until the oldest email in the window leaves it.
			waitSeconds float64
		)
		if err := tx.QueryRow(ctx, `
			SELECT count(*), coalesce(extract(epoch FROM min(created_at) + interval '1 hour' - now()), 0)
			FROM email_challenges
			WHERE email = $1 AND created_at > now() - interval '1 hour'`, in.email).Scan(&sentLastHour, &waitSeconds); err != nil {
			return err
		}

		if sentLastHour >= maxEmailsPerHour {
			return RateLimitedError{RetryAfter: time.Duration(waitSeconds * float64(time.Second))}
		}

		// Only the newest email works: older codes and links stop working.
		if _, err := tx.Exec(ctx, `
			UPDATE email_challenges SET consumed_at = now()
			WHERE email = $1 AND consumed_at IS NULL`, in.email); err != nil {
			return err
		}

		return tx.QueryRow(ctx, `
			INSERT INTO email_challenges (email, code_hash, token_hash, next, expires_at)
			VALUES ($1, $2, $3, $4, now() + make_interval(secs => $5))
			RETURNING id::text, expires_at`,
			in.email, in.codeHash, in.tokenHash, in.next, codeTTL.Seconds(),
		).Scan(&result.id, &result.expiresAt)
	})

	return result, err
}

func (s store) deleteChallenge(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM email_challenges WHERE id = $1`, id)

	return err
}

type consumed struct {
	email string
	next  string
}

// checkCode tests a code against the newest live challenge for email: a match consumes it, a miss
// counts an attempt and burns it at maxAttempts. The row is locked, so parallel guesses can't race.
func (s store) checkCode(ctx context.Context, email string, matches func(tokenHash, codeHash []byte) bool) (consumed, error) {
	var (
		result  consumed
		outcome error
	)

	err := pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
		var (
			id                  string
			tokenHash, codeHash []byte
		)

		err := tx.QueryRow(ctx, `
			SELECT id::text, token_hash, code_hash, next
			FROM email_challenges
			WHERE email = $1 AND consumed_at IS NULL AND expires_at > now()
			ORDER BY created_at DESC LIMIT 1
			FOR UPDATE`, email).Scan(&id, &tokenHash, &codeHash, &result.next)
		if errors.Is(err, pgx.ErrNoRows) {
			outcome = ErrExpired

			return nil
		}

		if err != nil {
			return err
		}

		if matches(tokenHash, codeHash) {
			result.email = email
			_, err := tx.Exec(ctx, `UPDATE email_challenges SET consumed_at = now() WHERE id = $1`, id)

			return err
		}

		// A miss is committed too: the attempt must count.
		var attempts int
		if err := tx.QueryRow(ctx, `
			UPDATE email_challenges
			SET attempts = attempts + 1,
			    consumed_at = CASE WHEN attempts + 1 >= $2 THEN now() END
			WHERE id = $1
			RETURNING attempts`, id, maxAttempts).Scan(&attempts); err != nil {
			return err
		}

		outcome = InvalidCodeError{AttemptsLeft: maxAttempts - attempts}
		if attempts >= maxAttempts {
			outcome = ErrTooManyAttempts
		}

		return nil
	})
	if err != nil {
		return consumed{}, err
	}

	return result, outcome
}

// consumeToken uses the link token once, atomically.
func (s store) consumeToken(ctx context.Context, tokenHash []byte) (consumed, error) {
	var result consumed

	err := s.db.QueryRow(ctx, `
		UPDATE email_challenges SET consumed_at = now()
		WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
		RETURNING email, next`, tokenHash).Scan(&result.email, &result.next)
	if errors.Is(err, pgx.ErrNoRows) {
		return consumed{}, ErrExpired
	}

	return result, err
}

// createSession finds or creates the user (verifying their email) and opens a session for this device.
// created reports whether this call created the user (xmax = 0: the row was inserted, not updated).
func (s store) createSession(ctx context.Context, email string, tokenHash []byte, userAgent string) (Session, bool, error) {
	session := Session{Email: email}

	var created bool

	err := pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx, `
			INSERT INTO users (email, email_verified_at) VALUES ($1, now())
			ON CONFLICT (email) DO UPDATE SET email_verified_at = coalesce(users.email_verified_at, now())
			RETURNING id::text, (xmax = 0)`, email).Scan(&session.UserID, &created); err != nil {
			return fmt.Errorf("upsert user: %w", err)
		}

		return tx.QueryRow(ctx, `
			INSERT INTO sessions (token_hash, user_id, user_agent, expires_at)
			VALUES ($1, $2, left($3, 256), now() + make_interval(secs => $4))
			RETURNING expires_at`, tokenHash, session.UserID, userAgent, SessionTTL.Seconds()).Scan(&session.ExpiresAt)
	})

	return session, created, err
}

// session reads a live session and slides its expiry when a renewal is due.
func (s store) session(ctx context.Context, tokenHash []byte) (Session, error) {
	var (
		session Session
		id      string
		due     bool
	)

	err := s.db.QueryRow(ctx, `
		SELECT s.id::text, s.user_id::text, u.email, s.expires_at,
		       s.last_seen_at < now() - make_interval(secs => $2)
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
		tokenHash, sessionRefresh.Seconds()).Scan(&id, &session.UserID, &session.Email, &session.ExpiresAt, &due)
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, ErrNoSession
	}

	if err != nil || !due {
		return session, err
	}

	err = s.db.QueryRow(ctx, `
		UPDATE sessions SET last_seen_at = now(), expires_at = now() + make_interval(secs => $2)
		WHERE id = $1 RETURNING expires_at`, id, SessionTTL.Seconds()).Scan(&session.ExpiresAt)

	return session, err
}

func (s store) revokeSession(ctx context.Context, tokenHash []byte) error {
	_, err := s.db.Exec(ctx, `UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, tokenHash)

	return err
}

// deleteExpired removes challenges past the per-address email window and sessions that expired or were
// revoked a day ago or more. Recent challenges stay: maxEmailsPerHour counts them.
func (s store) deleteExpired(ctx context.Context) (challenges, sessions int64, err error) {
	tag, err := s.db.Exec(ctx, `DELETE FROM email_challenges WHERE created_at < now() - interval '1 day'`)
	if err != nil {
		return 0, 0, err
	}

	challenges = tag.RowsAffected()

	tag, err = s.db.Exec(ctx, `
		DELETE FROM sessions
		WHERE expires_at < now() - interval '1 day' OR revoked_at < now() - interval '1 day'`)
	if err != nil {
		return challenges, 0, err
	}

	return challenges, tag.RowsAffected(), nil
}
