use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User {
    id: i32,
    name: String,
}

#[derive(Deserialize)]
struct CreateUser {
    name: String,
}

async fn create_user(
    State(pool): State<PgPool>,
    Json(body): Json<CreateUser>,
) -> (StatusCode, Json<User>) {
    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (name) VALUES ($1) RETURNING id, name",
    )
    .bind(&body.name)
    .fetch_one(&pool)
    .await
    .expect("insert failed");

    (StatusCode::CREATED, Json(user))
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("failed to connect to DB");

    let app = Router::new()
        .route("/users", post(create_user))
        .with_state(pool);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
