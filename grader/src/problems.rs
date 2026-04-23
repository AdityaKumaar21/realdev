use anyhow::{anyhow, Result};

pub struct Problem {
    pub id: String,
    pub title: String,
    pub test_cases: Vec<TestCase>,
}

pub struct TestCase {
    pub name: String,
    pub method: &'static str,
    pub path: &'static str,
    pub body: Option<&'static str>,
    pub expected_json: &'static str,
}

pub fn load(id: &str) -> Result<Problem> {
    match id {
        "p001-list-users" => Ok(Problem {
            id: id.into(),
            title: "List all users".into(),
            test_cases: vec![TestCase {
                name: "GET /users returns all users in id order".into(),
                method: "GET",
                path: "/users",
                body: None,
                expected_json: r#"[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"},{"id":3,"name":"Carol"}]"#,
            }],
        }),

        "p002-get-user" => Ok(Problem {
            id: id.into(),
            title: "Get user by ID".into(),
            test_cases: vec![TestCase {
                name: "GET /users/2 returns Bob".into(),
                method: "GET",
                path: "/users/2",
                body: None,
                expected_json: r#"{"id":2,"name":"Bob"}"#,
            }],
        }),

        "p003-create-user" => Ok(Problem {
            id: id.into(),
            title: "Create a user".into(),
            test_cases: vec![TestCase {
                name: "POST /users creates and returns new user".into(),
                method: "POST",
                path: "/users",
                body: Some(r#"{"name":"Dave"}"#),
                expected_json: r#"{"id":4,"name":"Dave"}"#,
            }],
        }),

        "p004-user-stats" => Ok(Problem {
            id: id.into(),
            title: "User statistics".into(),
            test_cases: vec![TestCase {
                name: "GET /stats returns correct user count".into(),
                method: "GET",
                path: "/stats",
                body: None,
                expected_json: r#"{"total_users":3}"#,
            }],
        }),

        "p005-update-user" => Ok(Problem {
            id: id.into(),
            title: "Update a user".into(),
            test_cases: vec![TestCase {
                name: "PUT /users/1 updates and returns user".into(),
                method: "PUT",
                path: "/users/1",
                body: Some(r#"{"name":"Alicia"}"#),
                expected_json: r#"{"id":1,"name":"Alicia"}"#,
            }],
        }),

        _ => Err(anyhow!("problem not found: {id}")),
    }
}

pub async fn seed(problem_id: &str, db: &sqlx::PgPool) -> Result<()> {
    match problem_id {
        "p001-list-users" | "p002-get-user" | "p003-create-user" | "p004-user-stats" | "p005-update-user" => {
            sqlx::query("TRUNCATE users RESTART IDENTITY CASCADE")
                .execute(db)
                .await?;
            sqlx::query("INSERT INTO users (name) VALUES ('Alice'), ('Bob'), ('Carol')")
                .execute(db)
                .await?;
            Ok(())
        }
        _ => Err(anyhow!("no seed for problem: {problem_id}")),
    }
}
