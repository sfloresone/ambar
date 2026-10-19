-- +goose Up

-- Sign-in always lands on the app's home, and no client ever sent a destination.
ALTER TABLE email_challenges DROP COLUMN next;

-- +goose Down

ALTER TABLE email_challenges ADD COLUMN next text NOT NULL DEFAULT '/';
