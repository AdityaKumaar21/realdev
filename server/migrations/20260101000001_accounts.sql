CREATE TABLE accounts (
    id            SERIAL PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    token         TEXT UNIQUE NOT NULL
);
