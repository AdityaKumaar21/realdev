-- ── Problems ──────────────────────────────────────────────────────────────────

INSERT INTO problems (id, ticket, title, difficulty, tags, tables, description, schema_sql, expected_display, starter, sort_order) VALUES
(
  'p001-list-users', 'RD-001', 'List All Users', 'Easy',
  ARRAY['GET', 'Database', 'SELECT'],
  ARRAY['users'],
  'Implement a GET /users endpoint that returns all users from the database as a JSON array, ordered by id ascending.',
  'CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);',
  'GET /users → 200 OK
[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"},{"id":3,"name":"Carol"}]',
  'use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User {
    id: i32,
    name: String,
}

async fn list_users(State(pool): State<PgPool>) -> Json<Vec<User>> {
    // TODO: query users table ordered by id
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/users", get(list_users)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}',
  1
),
(
  'p002-get-user', 'RD-002', 'Get User by ID', 'Easy',
  ARRAY['GET', 'Path Params', '404'],
  ARRAY['users'],
  'Implement GET /users/:id. Return the user if found. Return 404 if no user exists with that id.',
  'CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);',
  'GET /users/2  → 200 OK   {"id":2,"name":"Bob"}
GET /users/99 → 404 Not Found',
  'use axum::{extract::{Path, State}, http::StatusCode, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User { id: i32, name: String }

async fn get_user(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<User>, StatusCode> {
    // TODO: fetch by id, return 404 if missing
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/users/:id", get(get_user)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}',
  2
),
(
  'p003-create-user', 'RD-003', 'Create User', 'Easy',
  ARRAY['POST', 'Insert', '201'],
  ARRAY['users'],
  'Implement POST /users. Accept a JSON body with a name field, insert the user, and return the created user with status 201.',
  'CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);',
  'POST /users {"name":"Dave"} → 201 Created
{"id":4,"name":"Dave"}',
  'use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User { id: i32, name: String }

#[derive(Deserialize)]
struct CreateUser { name: String }

async fn create_user(
    State(pool): State<PgPool>,
    Json(body): Json<CreateUser>,
) -> (StatusCode, Json<User>) {
    // TODO: INSERT INTO users (name) VALUES ($1) RETURNING id, name
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/users", post(create_user)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}',
  3
),
(
  'p004-user-stats', 'RD-004', 'User Statistics', 'Medium',
  ARRAY['GET', 'Aggregate', 'COUNT'],
  ARRAY['users'],
  'Implement GET /stats that returns aggregate statistics about the users table. The response must include the total user count.',
  'CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);',
  'GET /stats → 200 OK
{"total_users":3}',
  'use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool, Row};

#[derive(Serialize)]
struct Stats { total_users: i64 }

async fn user_stats(State(pool): State<PgPool>) -> Json<Stats> {
    // TODO: SELECT COUNT(*) FROM users
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/stats", get(user_stats)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}',
  4
),
(
  'p005-update-user', 'RD-005', 'Update User', 'Medium',
  ARRAY['PUT', 'Update', '404'],
  ARRAY['users'],
  'Implement PUT /users/:id. Accept a JSON body with a name field, update the user, and return the updated user. Return 404 if the user does not exist.',
  'CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);',
  'PUT /users/1 {"name":"Alicia"} → 200 OK
{"id":1,"name":"Alicia"}',
  'use axum::{extract::{Path, State}, http::StatusCode, routing::put, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User { id: i32, name: String }

#[derive(Deserialize)]
struct UpdateUser { name: String }

async fn update_user(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(body): Json<UpdateUser>,
) -> Result<Json<User>, StatusCode> {
    // TODO: UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/users/:id", put(update_user)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}',
  5
);

-- ── Seed statements ───────────────────────────────────────────────────────────

INSERT INTO problem_seed (problem_id, sql_stmt, sort_order) VALUES
('p001-list-users', 'TRUNCATE users RESTART IDENTITY CASCADE', 1),
('p001-list-users', 'INSERT INTO users (name) VALUES (''Alice''), (''Bob''), (''Carol'')', 2),
('p002-get-user',   'TRUNCATE users RESTART IDENTITY CASCADE', 1),
('p002-get-user',   'INSERT INTO users (name) VALUES (''Alice''), (''Bob''), (''Carol'')', 2),
('p003-create-user','TRUNCATE users RESTART IDENTITY CASCADE', 1),
('p003-create-user','INSERT INTO users (name) VALUES (''Alice''), (''Bob''), (''Carol'')', 2),
('p004-user-stats', 'TRUNCATE users RESTART IDENTITY CASCADE', 1),
('p004-user-stats', 'INSERT INTO users (name) VALUES (''Alice''), (''Bob''), (''Carol'')', 2),
('p005-update-user','TRUNCATE users RESTART IDENTITY CASCADE', 1),
('p005-update-user','INSERT INTO users (name) VALUES (''Alice''), (''Bob''), (''Carol'')', 2);

-- ── Test cases ────────────────────────────────────────────────────────────────

INSERT INTO test_cases (problem_id, name, method, path, body, expected_status, expected_json, sort_order) VALUES

-- p001: list users
('p001-list-users', 'GET /users returns all users ordered by id', 'GET', '/users', NULL, 200,
 '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"},{"id":3,"name":"Carol"}]', 1),

-- p002: get user by id
('p002-get-user', 'GET /users/2 returns Bob', 'GET', '/users/2', NULL, 200,
 '{"id":2,"name":"Bob"}', 1),
('p002-get-user', 'GET /users/99 returns 404', 'GET', '/users/99', NULL, 404,
 '{"error":"not found"}', 2),

-- p003: create user
('p003-create-user', 'POST /users creates Dave with id 4', 'POST', '/users', '{"name":"Dave"}', 201,
 '{"id":4,"name":"Dave"}', 1),
('p003-create-user', 'POST /users with missing name returns 400', 'POST', '/users', '{}', 400,
 '{"error":"name is required"}', 2),

-- p004: user stats
('p004-user-stats', 'GET /stats returns total user count', 'GET', '/stats', NULL, 200,
 '{"total_users":3}', 1),

-- p005: update user
('p005-update-user', 'PUT /users/1 updates Alice to Alicia', 'PUT', '/users/1', '{"name":"Alicia"}', 200,
 '{"id":1,"name":"Alicia"}', 1),
('p005-update-user', 'PUT /users/99 returns 404', 'PUT', '/users/99', '{"name":"Ghost"}', 404,
 '{"error":"not found"}', 2);
