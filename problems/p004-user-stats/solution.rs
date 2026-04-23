use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool, Row};

#[derive(Serialize)]
struct Stats {
    total_users: i64,
}

async fn user_stats(State(pool): State<PgPool>) -> Json<Stats> {
    let row = sqlx::query("SELECT COUNT(*) as count FROM users")
        .fetch_one(&pool)
        .await
        .expect("query failed");

    Json(Stats {
        total_users: row.get::<i64, _>("count"),
    })
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
        .route("/stats", get(user_stats))
        .with_state(pool);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
