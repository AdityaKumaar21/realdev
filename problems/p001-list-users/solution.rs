use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User {
    id: i32,
    name: String,
}

async fn list_users(State(pool): State<PgPool>) -> Json<Vec<User>> {
    let users = sqlx::query_as::<_, User>("SELECT id, name FROM users ORDER BY id")
        .fetch_all(&pool)
        .await
        .expect("db query failed");
    Json(users)
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
        .route("/users", get(list_users))
        .with_state(pool);

    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
