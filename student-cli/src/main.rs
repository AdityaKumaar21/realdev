use anyhow::Result;
use clap::Parser;
use shared::{GradeResult, Submission};

#[derive(Parser)]
#[command(name = "submit", about = "Submit a Rust solution to the API trainer grader")]
struct Args {
    /// Path to your solution .rs file
    #[arg(short, long)]
    file: String,

    /// Problem id, e.g. p001-list-users
    #[arg(short, long)]
    problem: String,

    /// Your auth token (from register/login)
    #[arg(short, long)]
    token: String,

    /// Grader URL
    #[arg(long, default_value = "http://localhost:3000")]
    grader: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    let source_code = std::fs::read_to_string(&args.file)?;

    let sub = Submission {
        problem_id: args.problem,
        source_code,
    };

    println!("→ submitting to {}...", args.grader);
    let res = reqwest::Client::new()
        .post(format!("{}/submit", args.grader))
        .bearer_auth(&args.token)
        .json(&sub)
        .send()
        .await?;

    if res.status() == 401 {
        eprintln!("❌ Unauthorized — check your token");
        std::process::exit(1);
    }

    let result: GradeResult = res.json().await?;
    print_result(&result);
    std::process::exit(if result.passed { 0 } else { 1 });
}

fn print_result(r: &GradeResult) {
    println!();
    if let Some(err) = &r.compile_error {
        println!("❌ Compile error:\n{err}");
        return;
    }
    println!(
        "Tests: {}/{} passed {}",
        r.tests_passed,
        r.tests_total,
        if r.passed { "✅" } else { "❌" }
    );
    for t in &r.test_details {
        let mark = if t.passed { "✓" } else { "✗" };
        println!("  {mark} {}", t.name);
        if !t.passed {
            println!("    expected: {}", t.expected);
            println!("    actual:   {}", t.actual);
            if let Some(msg) = &t.message {
                println!("    note:     {msg}");
            }
        }
    }
}
