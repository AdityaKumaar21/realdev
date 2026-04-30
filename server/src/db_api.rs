use crate::{auth::AuthenticatedUser, AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde_json::{json, Value};
use std::sync::Arc;

const ALLOWED_TABLES: &[&str] = &["users"];

fn check_table(table: &str) -> Result<(), (StatusCode, String)> {
    if ALLOWED_TABLES.contains(&table) {
        Ok(())
    } else {
        Err((StatusCode::NOT_FOUND, format!("unknown table: {table}")))
    }
}

pub async fn list_rows(
    State(state): State<Arc<AppState>>,
    _user: AuthenticatedUser,
    Path(table): Path<String>,
) -> Result<Json<Vec<Value>>, (StatusCode, String)> {
    check_table(&table)?;

    let rows = sqlx::query(&format!("SELECT * FROM {table} ORDER BY id"))
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let result: Vec<Value> = rows
        .iter()
        .map(|row| {
            use sqlx::Row;
            json!({
                "id":   row.get::<i32, _>("id"),
                "name": row.get::<String, _>("name"),
            })
        })
        .collect();

    Ok(Json(result))
}

