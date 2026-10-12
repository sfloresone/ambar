-- +goose Up

-- One row per person. Emails are stored normalized (trimmed, lowercase) by the API.
CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email             text NOT NULL UNIQUE,
    email_verified_at timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
);

-- A sign-in attempt: one email carrying a 6-digit code and a link token. Using either consumes both.
-- Only hashes are stored.
CREATE TABLE email_challenges (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       text NOT NULL,
    code_hash   bytea NOT NULL,
    token_hash  bytea NOT NULL UNIQUE,
    next        text NOT NULL DEFAULT '/',
    attempts    integer NOT NULL DEFAULT 0,
    expires_at  timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_challenges_email_created ON email_challenges (email, created_at DESC);

-- One row per signed-in device. The token lives on the device (cookie or keychain); here only its hash.
CREATE TABLE sessions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash   bytea NOT NULL UNIQUE,
    user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    user_agent   text NOT NULL DEFAULT '',
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    expires_at   timestamptz NOT NULL,
    revoked_at   timestamptz
);

CREATE INDEX sessions_user ON sessions (user_id);

-- +goose Down

DROP TABLE sessions;
DROP TABLE email_challenges;
DROP TABLE users;
