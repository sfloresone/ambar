-- +goose Up

-- One Google and one GitHub account per Ambar account: Settings manages sign-in methods per provider.
CREATE UNIQUE INDEX user_identities_user_provider ON user_identities (user_id, provider);

-- +goose Down

DROP INDEX user_identities_user_provider;
