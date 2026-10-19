-- +goose Up

-- Accounts at Google or GitHub that sign in to a user. subject is the provider's stable id (Google's sub,
-- GitHub's numeric id), never the email; email is the verified address it had when linked. No provider
-- tokens are kept: Ambar only needs to know who signed in.
CREATE TABLE user_identities (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider   text NOT NULL,
    subject    text NOT NULL,
    email      text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, subject)
);

CREATE INDEX user_identities_user ON user_identities (user_id);

-- +goose Down

DROP TABLE user_identities;
