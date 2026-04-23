# p001 — List All Users

## Task

Write an Axum HTTP server with a `GET /users` endpoint that returns all users
from the database as a JSON array, ordered by `id` ascending.

## Database schema

```sql
CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);
```

## Environment variables

- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — Port your server must listen on

## Expected response

`GET /users` → `200 OK`

```json
[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"},{"id":3,"name":"Carol"}]
```

## Hints

- Use `sqlx::query_as` with a `#[derive(Serialize, sqlx::FromRow)]` struct
- Your server **must** bind to `0.0.0.0:$PORT`
- The grader will kill your server after all tests complete

## Submit

```sh
submit --file solution.rs --problem p001-list-users --student your_id
```
