use crate::problems;
use anyhow::{anyhow, Context};
use shared::{GradeResult, Submission, TestCaseResult};
use tokio::process::Command;

pub async fn grade(sub: &Submission, db: &sqlx::PgPool) -> anyhow::Result<GradeResult> {
    let problem = problems::load(&sub.problem_id)
        .with_context(|| format!("unknown problem: {}", sub.problem_id))?;

    problems::seed(&sub.problem_id, db).await?;

    // Reuse a fixed build dir per problem so dep compilation is cached.
    // Only main.rs changes between submissions — incremental rebuild takes ~2s.
    let proj = std::path::PathBuf::from("/tmp/api-trainer-cache").join(&sub.problem_id);
    tokio::fs::create_dir_all(proj.join("src")).await?;

    tokio::fs::write(
        proj.join("Cargo.toml"),
        r#"[package]
name = "submission"
version = "0.0.1"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "macros"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
"#,
    )
    .await?;

    tokio::fs::write(proj.join("src/main.rs"), &sub.source_code).await?;

    // Compile (debug — faster than release, sufficient for grading).
    let build = Command::new("cargo")
        .args(["build", "--quiet"])
        .current_dir(&proj)
        .output()
        .await?;

    if !build.status.success() {
        return Ok(GradeResult {
            passed: false,
            tests_passed: 0,
            tests_total: problem.test_cases.len(),
            compile_error: Some(String::from_utf8_lossy(&build.stderr).into_owned()),
            runtime_error: None,
            test_details: vec![],
        });
    }

    // Pick a free port, spawn the student's server.
    let port = free_port()?;
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/api_trainer".into());

    let bin = proj.join("target/debug/submission");
    let mut child = Command::new(&bin)
        .env("DATABASE_URL", &db_url)
        .env("PORT", port.to_string())
        .spawn()?;

    // Wait up to 5 s for the server to accept connections.
    let base = format!("http://127.0.0.1:{port}");
    let client = reqwest::Client::new();
    if let Err(e) = wait_ready(&client, &base, 5000).await {
        child.kill().await.ok();
        return Ok(GradeResult {
            passed: false,
            tests_passed: 0,
            tests_total: problem.test_cases.len(),
            compile_error: None,
            runtime_error: Some(format!("server did not start: {e}")),
            test_details: vec![],
        });
    }

    // Run each test case.
    let mut details = Vec::new();
    let mut passed_count = 0;

    for test in &problem.test_cases {
        let url = format!("{base}{}", test.path);

        let req = match test.method {
            "GET" => client.get(&url),
            "POST" => {
                let r = client.post(&url);
                if let Some(body) = test.body {
                    r.header("Content-Type", "application/json").body(body.to_string())
                } else {
                    r
                }
            }
            "PUT" => {
                let r = client.put(&url);
                if let Some(body) = test.body {
                    r.header("Content-Type", "application/json").body(body.to_string())
                } else {
                    r
                }
            }
            "DELETE" => client.delete(&url),
            other => {
                details.push(TestCaseResult {
                    name: test.name.clone(),
                    passed: false,
                    expected: test.expected_json.to_string(),
                    actual: String::new(),
                    message: Some(format!("unsupported method: {other}")),
                });
                continue;
            }
        };

        let result = tokio::time::timeout(
            std::time::Duration::from_secs(10),
            req.send(),
        )
        .await;

        let (actual_str, err_msg) = match result {
            Err(_) => (String::new(), Some("request timed out after 10s".into())),
            Ok(Err(e)) => (String::new(), Some(format!("request failed: {e}"))),
            Ok(Ok(resp)) => {
                let status = resp.status();
                match resp.text().await {
                    Ok(body) => {
                        if !status.is_success() {
                            (body.clone(), Some(format!("HTTP {status}")))
                        } else {
                            (body, None)
                        }
                    }
                    Err(e) => (String::new(), Some(format!("failed to read body: {e}"))),
                }
            }
        };

        let passed = err_msg.is_none() && compare_json(&actual_str, test.expected_json);
        if passed {
            passed_count += 1;
        }

        details.push(TestCaseResult {
            name: test.name.clone(),
            passed,
            expected: test.expected_json.to_string(),
            actual: actual_str,
            message: err_msg,
        });
    }

    child.kill().await.ok();

    let total = problem.test_cases.len();
    Ok(GradeResult {
        passed: passed_count == total,
        tests_passed: passed_count,
        tests_total: total,
        compile_error: None,
        runtime_error: None,
        test_details: details,
    })
}

fn free_port() -> anyhow::Result<u16> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0")?;
    Ok(listener.local_addr()?.port())
    // listener drops here, releasing the port — small race but fine for a prototype
}

async fn wait_ready(client: &reqwest::Client, base: &str, timeout_ms: u64) -> anyhow::Result<()> {
    let deadline = std::time::Instant::now() + std::time::Duration::from_millis(timeout_ms);
    loop {
        if client.get(base).send().await.is_ok() {
            return Ok(());
        }
        if std::time::Instant::now() >= deadline {
            return Err(anyhow!("timed out waiting for server"));
        }
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }
}

fn compare_json(actual: &str, expected: &str) -> bool {
    match (
        serde_json::from_str::<serde_json::Value>(actual),
        serde_json::from_str::<serde_json::Value>(expected),
    ) {
        (Ok(a), Ok(e)) => a == e,
        _ => actual.trim() == expected.trim(),
    }
}
