use serde::{Deserialize, Serialize};

/// A student's submission to the grader.
#[derive(Debug, Serialize, Deserialize)]
pub struct Submission {
    pub problem_id: String,
    pub source_code: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub username: String,
}

/// The grader's response after running the submission.
#[derive(Debug, Serialize, Deserialize)]
pub struct GradeResult {
    pub passed: bool,
    pub tests_passed: usize,
    pub tests_total: usize,
    pub compile_error: Option<String>,
    pub runtime_error: Option<String>,
    /// Per-test feedback for the student.
    pub test_details: Vec<TestCaseResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestCaseResult {
    pub name: String,
    pub method: String,
    pub path: String,
    pub passed: bool,
    pub expected: String,
    pub actual: String,
    pub message: Option<String>,
}
