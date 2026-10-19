// Package migrations holds the database schema as SQL files, embedded in the binary and applied in
// order by goose. Never edit a file that has been applied anywhere: fix forward with a new one.
package migrations

import (
	"context"
	"embed"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/pressly/goose/v3/lock"
)

//go:embed *.sql
var files embed.FS

// Up applies every pending migration. A Postgres advisory lock serializes concurrent callers (two
// instances starting, or test packages running in parallel), so only one applies each migration.
func Up(ctx context.Context, pool *pgxpool.Pool) error {
	db := stdlib.OpenDBFromPool(pool)
	defer db.Close()

	locker, err := lock.NewPostgresSessionLocker(lock.WithLockTimeout(1, 60))
	if err != nil {
		return fmt.Errorf("migrations: %w", err)
	}

	provider, err := goose.NewProvider(goose.DialectPostgres, db, files, goose.WithSessionLocker(locker))
	if err != nil {
		return fmt.Errorf("migrations: %w", err)
	}

	results, err := provider.Up(ctx)
	if err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}

	for _, result := range results {
		slog.InfoContext(ctx, "migration applied", "file", result.Source.Path, "duration", result.Duration)
	}

	return nil
}
