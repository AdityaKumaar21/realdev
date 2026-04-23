# API Trainer

A platform where students learn backend development by writing Rust programs
that query a database. Submissions are graded automatically.

## Architecture

```
┌──────────────┐   HTTP POST /submit   ┌────────────┐
│ student-cli  │ ────────────────────▶ │  grader    │
│ (CLI tool)   │                       │  (axum)    │
└──────────────┘                       └─────┬──────┘
                                             │
                                 compile + run in tempdir
                                             │
                                             ▼
                                       ┌────────────┐
                                       │ PostgreSQL │
                                       └────────────┘
```

## Crates

- **`shared/`** — submission/result types used by both sides
- **`grader/`** — HTTP server that receives submissions, compiles them in a
  temp cargo project, runs them against a seeded DB, and compares stdout to
  the expected answer
- **`student-cli/`** — command-line tool students use to submit solutions
- **`problems/`** — problem briefs and reference solutions

## Prerequisites

- Rust (stable)
- PostgreSQL running locally
- `sqlx-cli` for migrations: `cargo install sqlx-cli --no-default-features --features postgres`

## Setup

```sh
# 1. Start Postgres and create the DB
createdb api_trainer
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/api_trainer

# 2. Run the grader (migrations apply automatically on startup)
cargo run -p grader

# 3. In another shell, submit the sample solution
cargo run -p student-cli -- \
    --file problems/p001-list-users/solution.rs \
    --problem p001-list-users \
    --student alice123
```

## How grading works

1. CLI posts the student's source code + problem id to `/submit`
2. Grader resets the DB to a known state (seeds fixtures for this problem)
3. Grader writes the code into a throwaway cargo project in `/tmp`
4. Grader compiles with `cargo build --release`
5. Grader runs the binary with `DATABASE_URL` set, 10-second timeout
6. stdout is compared to expected output (JSON-aware comparison)
7. Result is returned to the CLI

## Adding a new problem

1. Add a case to `grader/src/problems.rs::load` with test cases
2. Add a seed case to `grader/src/problems.rs::seed`
3. Add any new tables to `grader/migrations/`
4. Write `problems/pXXX-name/README.md` and a reference solution

## Security note — important for scaling

The grader currently runs student code directly on the host. This is fine for
a prototype but **not safe for real use** — a malicious student could wipe
your DB or spawn a crypto miner. Before using this with real students, run
submissions in a sandbox: Docker containers with `--network=none` + a
scratch DB per submission, Firecracker microVMs, or a service like E2B.
