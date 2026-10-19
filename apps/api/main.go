// Command api is the Ambar backend: one binary, configured by environment variables (see .env.example).
package main

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"ambar/api/auth"
	"ambar/api/mail"
	"ambar/api/migrations"
)

func main() {
	// Local overrides for development (gitignored). Never overrides variables already set, and does
	// nothing on the VPS, where the service environment holds the configuration.
	_ = godotenv.Load(".env.local")

	if err := run(context.Background(), os.Getenv); err != nil {
		slog.Error("api stopped", "err", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, getenv func(string) string) error {
	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger := newLogger(getenv("LOG_FORMAT"))
	slog.SetDefault(logger)

	// No defaults: addresses and credentials come only from the environment (.env.local in development).
	env, err := requireEnv(getenv, "ADDR", "DATABASE_URL", "APP_URL", "ALLOWED_ORIGINS")
	if err != nil {
		return err
	}

	addr, databaseURL, appURL := env["ADDR"], env["DATABASE_URL"], env["APP_URL"]
	// The app that receives the sign-in link. An https URL means production: every secret must be set.
	production := strings.HasPrefix(appURL, "https://")

	secret, err := authSecret(getenv("AUTH_SECRET"), production)
	if err != nil {
		return err
	}

	mailer, err := newMailer(getenv("RESEND_API_KEY"), getenv("MAIL_FROM"), production)
	if err != nil {
		return err
	}

	// The pool connects lazily: the API starts even if Postgres is down, and /healthz reports it.
	db, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		// Not wrapped: the parse error can echo the URL, password included.
		return errors.New("DATABASE_URL is not a valid connection string")
	}
	defer db.Close()

	if err := migrations.Up(ctx, db); err != nil {
		return err
	}

	authService := auth.NewService(db, mailer, secret, appURL)

	go cleanupLoop(ctx, authService)

	handler := newRouter(&api{
		logger:         logger,
		db:             db,
		auth:           authService,
		allowedOrigins: splitList(env["ALLOWED_ORIGINS"]),
		// Only "true" when the API is reachable solely through our reverse proxy (see realIP).
		trustProxy:   getenv("TRUST_PROXY") == "true",
		secureCookie: production,
	})

	server := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       2 * time.Minute,
	}

	serveErr := make(chan error, 1)

	go func() {
		logger.Info("api listening", "addr", addr, "production", production)
		serveErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return fmt.Errorf("serve: %w", err)
	case <-ctx.Done():
	}

	// Let in-flight requests finish before exiting.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}

	logger.Info("api stopped cleanly")

	return nil
}

// cleanupLoop runs auth cleanup once at start and then every auth.CleanupEvery until ctx ends.
func cleanupLoop(ctx context.Context, service *auth.Service) {
	ticker := time.NewTicker(auth.CleanupEvery)
	defer ticker.Stop()

	for {
		challenges, sessions, err := service.Cleanup(ctx)
		if err != nil {
			slog.WarnContext(ctx, "auth cleanup failed", "err", err)
		} else if challenges > 0 || sessions > 0 {
			slog.InfoContext(ctx, "auth cleanup", "challenges", challenges, "sessions", sessions)
		}

		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// authSecret keys the sign-in code hashes. Development gets a random one per run (codes from a previous
// run stop working, which is fine there).
func authSecret(value string, production bool) ([]byte, error) {
	if len(value) >= 32 {
		return []byte(value), nil
	}

	if production {
		return nil, errors.New("AUTH_SECRET must be set to at least 32 random characters")
	}

	secret := make([]byte, 32)
	_, _ = rand.Read(secret)

	return secret, nil
}

// newMailer: Resend when configured; otherwise the console, which production refuses.
func newMailer(apiKey, from string, production bool) (auth.Mailer, error) {
	if apiKey != "" && from != "" {
		return mail.NewResend(apiKey, from), nil
	}

	if production {
		return nil, errors.New("RESEND_API_KEY and MAIL_FROM are required in production")
	}

	slog.Warn("RESEND_API_KEY unset: sign-in emails are printed to the console")

	return mail.Console{}, nil
}

// newLogger writes JSON for the VPS log collector (LOG_FORMAT=json) or readable text.
func newLogger(format string) *slog.Logger {
	if format == "json" {
		return slog.New(slog.NewJSONHandler(os.Stdout, nil))
	}

	return slog.New(slog.NewTextHandler(os.Stdout, nil))
}

// requireEnv reads the variables that have no default, naming every missing one at once.
func requireEnv(getenv func(string) string, keys ...string) (map[string]string, error) {
	values := make(map[string]string, len(keys))

	var missing []string

	for _, key := range keys {
		if values[key] = getenv(key); values[key] == "" {
			missing = append(missing, key)
		}
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("missing %s: copy .env.example to .env.local (development) or set them in the service environment", strings.Join(missing, ", "))
	}

	return values, nil
}

func splitList(value string) []string {
	var items []string

	for item := range strings.SplitSeq(value, ",") {
		if item = strings.TrimSpace(item); item != "" {
			items = append(items, item)
		}
	}

	return items
}
