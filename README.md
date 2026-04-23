# RealDev

A platform where students learn backend engineering by writing real HTTP API handlers — not toy programs, not DSA puzzles. Write an Axum server, submit it, get it compiled and tested against a live PostgreSQL database.

## What it is

Students pick a ticket, read a spec, implement a working Axum HTTP server, and submit. The grader spins up their server, fires real HTTP requests at it, and checks the responses. Same loop real engineers do every day.

Supports multiple languages in future. Currently: Rust (Axum).

## Architecture

```
  BROWSER                         GRADER (port 3000)                POSTGRES
  ───────                         ──────────────────                ────────

┌──────────────────────┐
│  Web UI              │   POST /register
│  React + Vite        │   POST /login                         ┌────────────┐
│  Monaco editor       │ ─────────────────────────────────▶    │  accounts  │
│                      │ ◀─────────────── { token }            │  table     │
│  ┌────────────────┐  │                                       └────────────┘
│  │ Problem list   │  │
│  │ Code editor    │  │   POST /submit                        ┌────────────┐
│  │ Results panel  │  │   Authorization: Bearer <token>       │  users     │
│  │ Database tab   │  │ ─────────────────────────────────▶    │  table     │
│  └────────────────┘  │                                       └────────────┘
│                      │                  │
│                      │     ┌────────────▼─────────────┐
│                      │     │  runner::grade()         │
│                      │     │                          │
│                      │     │  1. TRUNCATE + seed DB   │
│                      │     │  2. write src to         │
│                      │     │     /tmp/api-trainer-    │
│                      │     │     cache/{problem_id}/  │
│                      │     │  3. cargo build (debug,  │
│                      │     │     incremental)         │
│                      │     │  4. spawn binary         │
│                      │     │     PORT=free            │
│                      │     │     DATABASE_URL=...     │
│                      │     │  5. wait for /health     │
│                      │     │  6. fire test HTTP reqs  │
│                      │     │  7. compare JSON structs │
│                      │     │  8. kill process         │
│                      │     └────────────┬─────────────┘
│                      │                  │
│                      │ ◀── GradeResult ─┘
│                      │     { passed, tests_passed,
│                      │       tests_total, test_details,
│                      │       compile_error?, runtime_error? }
│                      │
│                      │   GET  /db/users                      ┌────────────┐
│  Database tab ───────│ ─────────────────────────────────▶    │            │
│  (live editor)       │   POST /db/users                      │  live DB   │
│                      │   PUT  /db/users/:id                  │  (same PG) │
│                      │   DELETE /db/users/:id                │            │
└──────────────────────┘ ◀─────────────────────────────────    └────────────┘
```

## Crates

- **`shared/`** — `Submission`, `GradeResult`, `AuthRequest/Response` types
- **`grader/`** — Axum server: auth, grading engine, live DB API
- **`student-cli/`** — CLI for submitting from the terminal
- **`web/`** — React + Vite + Monaco web UI
- **`problems/`** — problem specs and reference solutions

## Problems

| ID | Title | Tags |
| -- | ----- | ---- |
| p001 | List Users | GET, SELECT |
| p002 | Get User by ID | GET, Path Params, 404 |
| p003 | Create User | POST, Insert, 201 |
| p004 | User Stats | GET, Aggregate, COUNT |
| p005 | Update User | PUT, Update, 404 |

## Prerequisites

- Rust (stable)
- PostgreSQL running locally
- Node.js 18+ (for the web UI)

## Setup

```sh
# 1. Create the database
createdb api_trainer
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/api_trainer

# 2. Start the grader (auto-runs migrations on startup)
cargo run -p grader

# 3. Start the web UI (in a separate terminal)
cd web && npm install && npm run dev
# Open http://localhost:5173
```

## How grading works

1. Student registers/logs in → gets an auth token
2. Submits source code + problem ID via web UI or CLI
3. Grader resets DB to known state (seeds fixtures for that problem)
4. Grader writes code into a persistent cargo project under `/tmp/api-trainer-cache/{problem_id}/`
5. Compiles with `cargo build` (debug, incremental — first run ~30-60s, subsequent ~2-3s)
6. Spawns the student's server with `DATABASE_URL` + a free `PORT`
7. Fires HTTP requests matching the problem's test cases
8. Compares JSON responses structurally (key order doesn't matter)
9. Returns pass/fail per test case

## Using the CLI

```sh
# Register
cargo run -p student-cli -- register --username alice

# Login
cargo run -p student-cli -- login --username alice

# Submit
cargo run -p student-cli -- \
    --token <your-token> \
    --file problems/p001-list-users/solution.rs \
    --problem p001-list-users
```

## Adding a new problem

1. Add a `Problem` struct to `grader/src/problems.rs` with test cases and seed data
2. Add the problem definition to `web/src/App.tsx` (PROBLEMS array)
3. Write a reference solution in `problems/pXXX-name/solution.rs`

