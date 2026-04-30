CREATE TABLE problems (
    id               TEXT PRIMARY KEY,
    ticket           TEXT NOT NULL,
    title            TEXT NOT NULL,
    difficulty       TEXT NOT NULL,
    tags             TEXT[] NOT NULL DEFAULT '{}',
    tables           TEXT[] NOT NULL DEFAULT '{}',
    description      TEXT NOT NULL,
    schema_sql       TEXT NOT NULL,
    expected_display TEXT NOT NULL,
    starter          TEXT NOT NULL,
    sort_order       INT  NOT NULL DEFAULT 0
);

CREATE TABLE problem_seed (
    id           SERIAL PRIMARY KEY,
    problem_id   TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    sql_stmt     TEXT NOT NULL,
    sort_order   INT  NOT NULL DEFAULT 0
);

CREATE TABLE test_cases (
    id              SERIAL PRIMARY KEY,
    problem_id      TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    method          TEXT NOT NULL,
    path            TEXT NOT NULL,
    body            TEXT,
    expected_status INT  NOT NULL DEFAULT 200,
    expected_json   TEXT NOT NULL,
    sort_order      INT  NOT NULL DEFAULT 0
);
