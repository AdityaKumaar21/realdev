mod auth;
mod db_api;
mod problems;
mod runner;

use auth::AuthenticatedUser;
use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use problems::ProblemSummary;
use shared::{GradeResult, Submission};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let db_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let db = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::migrate!("./migrations").run(&db).await?;

    let state = Arc::new(AppState { db });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/register", post(auth::register))
        .route("/login", post(auth::login))
        .route("/submit", post(submit))
        .route("/problems", get(list_problems))
        .route("/db/:table", get(db_api::list_rows))
        .route("/health", get(|| async { "ok" }))
        .layer(cors)
        .with_state(state);

    let addr = "0.0.0.0:3000";
    tracing::info!("grader listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn list_problems(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ProblemSummary>>, (StatusCode, String)> {
    let summaries = problems::list_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(summaries))
}

async fn submit(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
    Json(sub): Json<Submission>,
) -> Result<Json<GradeResult>, (StatusCode, String)> {
    tracing::info!("submission from {} for {}", user.username, sub.problem_id);
    let result = runner::grade(&sub, &state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(result))
}
