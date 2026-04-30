# RealDev

A platform where students learn backend engineering by writing real HTTP API handlers — not toy programs, not DSA puzzles. Write an Axum server, submit it, get it compiled and tested against a live PostgreSQL database.

![Dashboard](assets/videos/dashboard.gif)

## What it is

Students pick a ticket, read a spec, implement a working Axum HTTP server, and submit. The server spins up their code, fires real HTTP requests at it, and checks the responses. Same loop real engineers do every day.

Supports multiple languages in future. Currently: Rust (Axum).

## Architecture

```
  BROWSER                         SERVER (port 3000)                 POSTGRES
  ───────                         ──────────────────                 ────────

┌──────────────────────┐
│  Frontend            │   POST /register
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

## Project Structure

```
server/        Rust backend — auth, problem listing, grading, DB API
shared/        Shared types (GradeResult, Submission, TestCaseResult)
frontend/      React + Vite + Monaco editor
```

## Problems

| ID | Title | Tags |
| -- | ----- | ---- |
| p001 | List Users | GET, SELECT |
| p002 | Get User by ID | GET, Path Params, 404 |
| p003 | Create User | POST, Insert, 201 |
| p004 | User Stats | GET, Aggregate, COUNT |
| p005 | Update User | PUT, Update, 404 |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) or [Podman](https://podman.io/getting-started/installation) with Compose

No Rust, PostgreSQL, or Node.js required — everything runs inside containers.

## Setup (Recommended)

```sh
# Docker
docker compose up --build

# Podman
podman compose up --build
```

Open <http://localhost:5173> once you see:

```text
server-1  | INFO server: server listening on 0.0.0.0:3000
```

First build takes a few minutes (compiling Rust). Subsequent starts are fast — build cache is persisted in a volume.

### Manual setup (without Docker)

Prerequisites: Rust (stable 1.88+), PostgreSQL, Node.js 18+

```sh
# 1. Create the database
createdb api_trainer
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/api_trainer

# 2. Start the server (auto-runs migrations on startup)
cargo run -p server

# 3. Start the frontend (in a separate terminal)
cd frontend && npm install && npm run dev
# Open http://localhost:5173
```

## How grading works

1. Student registers/logs in → gets an auth token
2. Submits source code + problem ID via web UI
3. Server resets DB to known state (seeds fixtures for that problem)
4. Server writes code into a persistent cargo project under `/tmp/api-trainer-cache/{problem_id}/`
5. Compiles with `cargo build` (debug, incremental — first run ~30-60s, subsequent ~2-3s)
6. Spawns the student's server with `DATABASE_URL` + a free `PORT`
7. Fires HTTP requests matching the problem's test cases
8. Compares JSON responses structurally (key order doesn't matter)
9. Returns pass/fail per test case

## Adding a new problem

1. Add a `Problem` struct to `server/src/problems.rs` with test cases and seed data
2. Add the problem definition to `frontend/src/App.tsx` (PROBLEMS array)
3. Write a reference solution in `SOLUTIONS.md`

## Reference Solutions

See [SOLUTIONS.md](SOLUTIONS.md) for reference implementations of each problem.
