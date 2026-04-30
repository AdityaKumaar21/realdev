use crate::{auth::AuthenticatedUser, AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
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

#[derive(Deserialize)]
pub struct UserBody {
    pub name: String,
}

#[derive(Serialize)]
pub struct UserRow {
    pub id: i32,
    pub name: String,
}

pub async fn insert_row(
    State(state): State<Arc<AppState>>,
    _user: AuthenticatedUser,
    Path(table): Path<String>,
    Json(body): Json<UserBody>,
) -> Result<Json<UserRow>, (StatusCode, String)> {
    check_table(&table)?;

    let row = sqlx::query_as::<_, (i32, String)>(
        &format!("INSERT INTO {table} (name) VALUES ($1) RETURNING id, name"),
    )
    .bind(&body.name)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(UserRow { id: row.0, name: row.1 }))
}

pub async fn update_row(
    State(state): State<Arc<AppState>>,
    _user: AuthenticatedUser,
    Path((table, id)): Path<(String, i32)>,
    Json(body): Json<UserBody>,
) -> Result<Json<UserRow>, (StatusCode, String)> {
    check_table(&table)?;

    let row = sqlx::query_as::<_, (i32, String)>(
        &format!("UPDATE {table} SET name = $1 WHERE id = $2 RETURNING id, name"),
    )
    .bind(&body.name)
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, format!("row {id} not found")))?;

    Ok(Json(UserRow { id: row.0, name: row.1 }))
}

pub async fn delete_row(
    State(state): State<Arc<AppState>>,
    _user: AuthenticatedUser,
    Path((table, id)): Path<(String, i32)>,
) -> Result<StatusCode, (StatusCode, String)> {
    check_table(&table)?;

    sqlx::query(&format!("DELETE FROM {table} WHERE id = $1"))
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
