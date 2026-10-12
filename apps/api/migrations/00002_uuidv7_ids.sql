-- +goose Up

-- Internal ids are time-ordered (UUIDv7, native in Postgres 18): inserts land at the end of the index and
-- the id itself tells when the row was created. users keeps random v4 ids: user ids reach clients, and a
-- v7 id would reveal when someone signed up.
ALTER TABLE email_challenges ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE sessions ALTER COLUMN id SET DEFAULT uuidv7();

-- +goose Down

ALTER TABLE email_challenges ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
