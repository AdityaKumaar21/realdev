use anyhow::{Context, Result};
use serde::Serialize;
use sqlx::Row;

pub struct TestCase {
    pub name: String,
    pub method: String,
    pub path: String,
    pub body: Option<String>,
    pub expected_status: u16,
    pub expected_json: String,
}

pub struct Problem {
    pub id: String,
    pub title: String,
    pub test_cases: Vec<TestCase>,
}

#[derive(Debug, Serialize)]
pub struct TestCaseSummary {
    pub name: String,
    pub method: String,
    pub path: String,
    pub body: Option<String>,
    pub expected_status: i32,
    pub expected_json: String,
}

#[derive(Debug, Serialize)]
pub struct ProblemSummary {
    pub id: String,
    pub ticket: String,
    pub title: String,
    pub difficulty: String,
    pub tags: Vec<String>,
    pub tables: Vec<String>,
    pub description: String,
    pub schema_sql: String,
    pub expected_display: String,
    pub starter: String,
    pub test_cases: Vec<TestCaseSummary>,
}

pub async fn load(id: &str, db: &sqlx::PgPool) -> Result<Problem> {
    let row = sqlx::query("SELECT id, title FROM problems WHERE id = $1")
        .bind(id)
        .fetch_optional(db)
        .await
        .context("failed to query problem")?
        .with_context(|| format!("unknown problem: {id}"))?;

    let tc_rows = sqlx::query(
        "SELECT name, method, path, body, expected_status, expected_json
         FROM test_cases WHERE problem_id = $1 ORDER BY sort_order",
    )
    .bind(id)
    .fetch_all(db)
    .await
    .context("failed to query test_cases")?;

    let test_cases = tc_rows
        .into_iter()
        .map(|r| TestCase {
            name: r.get("name"),
            method: r.get("method"),
            path: r.get("path"),
            body: r.get("body"),
            expected_status: r.get::<i32, _>("expected_status") as u16,
            expected_json: r.get("expected_json"),
        })
        .collect();

    Ok(Problem {
        id: row.get("id"),
        title: row.get("title"),
        test_cases,
    })
}

pub async fn seed(problem_id: &str, db: &sqlx::PgPool) -> Result<()> {
    let stmts = sqlx::query(
        "SELECT sql_stmt FROM problem_seed WHERE problem_id = $1 ORDER BY sort_order",
    )
    .bind(problem_id)
    .fetch_all(db)
    .await
    .context("failed to query problem_seed")?;

    let mut tx = db.begin().await.context("failed to begin transaction")?;
    for row in stmts {
        let stmt: String = row.get("sql_stmt");
        sqlx::query(&stmt)
            .execute(&mut *tx)
            .await
            .with_context(|| format!("seed stmt failed: {stmt}"))?;
    }
    tx.commit().await.context("failed to commit seed transaction")?;
    Ok(())
}

pub async fn list_all(db: &sqlx::PgPool) -> Result<Vec<ProblemSummary>> {
    let problems = sqlx::query(
        "SELECT id, ticket, title, difficulty, tags, tables, description,
                schema_sql, expected_display, starter
         FROM problems ORDER BY sort_order",
    )
    .fetch_all(db)
    .await
    .context("failed to query problems")?;

    let mut summaries = Vec::new();

    for p in problems {
        let id: String = p.get("id");

        let tc_rows = sqlx::query(
            "SELECT name, method, path, body, expected_status, expected_json
             FROM test_cases WHERE problem_id = $1 ORDER BY sort_order",
        )
        .bind(&id)
        .fetch_all(db)
        .await
        .context("failed to query test_cases")?;

        let test_cases = tc_rows
            .into_iter()
            .map(|r| TestCaseSummary {
                name: r.get("name"),
                method: r.get("method"),
                path: r.get("path"),
                body: r.get("body"),
                expected_status: r.get("expected_status"),
                expected_json: r.get("expected_json"),
            })
            .collect();

        summaries.push(ProblemSummary {
            id,
            ticket: p.get("ticket"),
            title: p.get("title"),
            difficulty: p.get("difficulty"),
            tags: p.get("tags"),
            tables: p.get("tables"),
            description: p.get("description"),
            schema_sql: p.get("schema_sql"),
            expected_display: p.get("expected_display"),
            starter: p.get("starter"),
            test_cases,
        });
    }

    Ok(summaries)
}
