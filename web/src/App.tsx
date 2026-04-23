import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import "./App.css";

interface TestCaseResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  message: string | null;
}

interface GradeResult {
  passed: boolean;
  tests_passed: number;
  tests_total: number;
  compile_error: string | null;
  runtime_error: string | null;
  test_details: TestCaseResult[];
}

interface Problem {
  id: string;
  ticket: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  tables: string[];
  description: string;
  schema: string;
  expected: string;
  starter: string;
}

interface DbRow { id: number; name: string; }


const PROBLEMS: Problem[] = [
  {
    id: "p001-list-users",
    ticket: "RD-001",
    title: "List All Users",
    difficulty: "Easy",
    tags: ["GET", "Database", "SELECT"],
    tables: ["users"],
    description: "Implement a GET /users endpoint that returns all users from the database as a JSON array, ordered by id ascending.",
    schema: `CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);`,
    expected: `GET /users → 200 OK
[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"},{"id":3,"name":"Carol"}]`,
    starter: `use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User {
    id: i32,
    name: String,
}

async fn list_users(State(pool): State<PgPool>) -> Json<Vec<User>> {
    // TODO: query users table ordered by id
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/users", get(list_users)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
`,
  },
  {
    id: "p002-get-user",
    ticket: "RD-002",
    title: "Get User by ID",
    difficulty: "Easy",
    tags: ["GET", "Path Params", "404"],
    tables: ["users"],
    description: "Implement GET /users/:id. Return the user if found. Return 404 if no user exists with that id.",
    schema: `CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);`,
    expected: `GET /users/2  → 200 OK   {"id":2,"name":"Bob"}
GET /users/99 → 404 Not Found`,
    starter: `use axum::{extract::{Path, State}, http::StatusCode, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User { id: i32, name: String }

async fn get_user(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<User>, StatusCode> {
    // TODO: fetch by id, return 404 if missing
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/users/:id", get(get_user)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
`,
  },
  {
    id: "p003-create-user",
    ticket: "RD-003",
    title: "Create User",
    difficulty: "Easy",
    tags: ["POST", "Insert", "201"],
    tables: ["users"],
    description: "Implement POST /users. Accept a JSON body with a name field, insert the user, and return the created user with status 201.",
    schema: `CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);`,
    expected: `POST /users {"name":"Dave"} → 201 Created
{"id":4,"name":"Dave"}`,
    starter: `use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User { id: i32, name: String }

#[derive(Deserialize)]
struct CreateUser { name: String }

async fn create_user(
    State(pool): State<PgPool>,
    Json(body): Json<CreateUser>,
) -> (StatusCode, Json<User>) {
    // TODO: INSERT INTO users (name) VALUES ($1) RETURNING id, name
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/users", post(create_user)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
`,
  },
  {
    id: "p004-user-stats",
    ticket: "RD-004",
    title: "User Statistics",
    difficulty: "Medium",
    tags: ["GET", "Aggregate", "COUNT"],
    tables: ["users"],
    description: "Implement GET /stats that returns aggregate statistics about the users table. The response must include the total user count.",
    schema: `CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);`,
    expected: `GET /stats → 200 OK
{"total_users":3}`,
    starter: `use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool, Row};

#[derive(Serialize)]
struct Stats { total_users: i64 }

async fn user_stats(State(pool): State<PgPool>) -> Json<Stats> {
    // TODO: SELECT COUNT(*) FROM users
    // Use sqlx::query (not query!) to avoid compile-time DB check
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/stats", get(user_stats)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
`,
  },
  {
    id: "p005-update-user",
    ticket: "RD-005",
    title: "Update User",
    difficulty: "Medium",
    tags: ["PUT", "Update", "404"],
    tables: ["users"],
    description: "Implement PUT /users/:id. Accept a JSON body with a name field, update the user, and return the updated user. Return 404 if the user does not exist.",
    schema: `CREATE TABLE users (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);`,
    expected: `PUT /users/1 {"name":"Alicia"} → 200 OK
{"id":1,"name":"Alicia"}`,
    starter: `use axum::{extract::{Path, State}, http::StatusCode, routing::put, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Serialize, sqlx::FromRow)]
struct User { id: i32, name: String }

#[derive(Deserialize)]
struct UpdateUser { name: String }

async fn update_user(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(body): Json<UpdateUser>,
) -> Result<Json<User>, StatusCode> {
    // TODO: UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name
    todo!()
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".into());
    let pool = PgPoolOptions::new().max_connections(5).connect(&db_url).await.unwrap();
    let app = Router::new().route("/users/:id", put(update_user)).with_state(pool);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
`,
  },
];

// ─── DB Viewer ───────────────────────────────────────────────────────────────

function DbViewer({ table, token }: { table: string; token: string }) {
  const [rows, setRows] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function fetchRows() {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/db/${table}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRows(); }, [table]);

  async function saveEdit(id: number) {
    await fetch(`http://localhost:3000/db/${table}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editVal }),
    });
    setEditingId(null);
    fetchRows();
  }

  async function deleteRow(id: number) {
    await fetch(`http://localhost:3000/db/${table}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchRows();
  }

  async function addRow() {
    if (!newName.trim()) return;
    setAdding(true);
    await fetch(`http://localhost:3000/db/${table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setAdding(false);
    fetchRows();
  }

  return (
    <div className="db-viewer">
      <div className="db-toolbar">
        <span className="db-table-name">{table}</span>
        <div className="db-toolbar-right">
          <span className="db-reset-note">resets on each run</span>
          <button className="db-refresh-btn" onClick={fetchRows} disabled={loading}>
            {loading ? "…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div className="db-table-wrap">
        <table className="db-table">
          <thead>
            <tr>
              <th>id</th>
              <th>name</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="db-id">{row.id}</td>
                <td>
                  {editingId === row.id ? (
                    <input
                      className="db-edit-input"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(row.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="db-cell-name"
                      onClick={() => { setEditingId(row.id); setEditVal(row.name); }}
                    >
                      {row.name}
                    </span>
                  )}
                </td>
                <td className="db-actions">
                  {editingId === row.id ? (
                    <>
                      <button className="db-btn save" onClick={() => saveEdit(row.id)}>✓</button>
                      <button className="db-btn cancel" onClick={() => setEditingId(null)}>✕</button>
                    </>
                  ) : (
                    <button className="db-btn del" onClick={() => deleteRow(row.id)}>×</button>
                  )}
                </td>
              </tr>
            ))}
            <tr className="db-add-row">
              <td className="db-id">—</td>
              <td>
                <input
                  className="db-edit-input"
                  placeholder="new name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRow()}
                />
              </td>
              <td>
                <button className="db-btn save" onClick={addRow} disabled={adding || !newName.trim()}>+</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Auth Screen ────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: (token: string, username: string) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3000/${tab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(typeof data === "string" ? data : `Error ${res.status}`);
      else onAuth(data.token, data.username);
    } catch {
      setError("Network error — is the grader running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-real">Real</span>
          <span className="auth-logo-dev">Dev</span>
        </div>
        <p className="auth-tagline">Build real APIs. Ship real code.</p>
        <div className="auth-tabs">
          <button className={`auth-tab${tab === "login" ? " active" : ""}`} onClick={() => setTab("login")}>Sign in</button>
          <button className={`auth-tab${tab === "register" ? " active" : ""}`} onClick={() => setTab("register")}>Register</button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Username</label>
            <input className="auth-input" placeholder="engineer42" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : tab === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("rd_token"));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem("rd_username"));

  function handleAuth(t: string, u: string) {
    localStorage.setItem("rd_token", t);
    localStorage.setItem("rd_username", u);
    setToken(t); setUsername(u);
  }

  function handleLogout() {
    localStorage.removeItem("rd_token");
    localStorage.removeItem("rd_username");
    setToken(null); setUsername(null);
  }

  if (!token) return <AuthScreen onAuth={handleAuth} />;
  return <MainApp token={token} username={username!} onLogout={handleLogout} />;
}

// ─── Difficulty Badge ─────────────────────────────────────────────────────────

function DiffBadge({ level }: { level: Problem["difficulty"] }) {
  return <span className={`diff-badge diff-${level.toLowerCase()}`}>{level}</span>;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function MainApp({ token, username, onLogout }: { token: string; username: string; onLogout: () => void }) {
  const [problemIdx, setProblemIdx] = useState(0);
  const problem = PROBLEMS[problemIdx];

  const [codes, setCodes] = useState<Record<string, string>>(
    Object.fromEntries(PROBLEMS.map((p) => [p.id, p.starter]))
  );
  const code = codes[problem.id];
  function setCode(val: string) {
    setCodes((prev) => ({ ...prev, [problem.id]: val }));
  }

  const [allResults, setAllResults] = useState<Record<string, GradeResult>>({});
  const result = allResults[problem.id] ?? null;

  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"output" | "database">("output");
  const handleSubmitRef = useRef<() => void>(() => {});

  function selectProblem(i: number) {
    setProblemIdx(i);
    setError(null);
  }

  async function handleSubmit() {
    if (status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("http://localhost:3000/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ problem_id: problem.id, source_code: code }),
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401) { onLogout(); return; }
        setError(`Server error ${res.status}: ${text}`);
      } else {
        const data: GradeResult = await res.json();
        setAllResults((prev) => ({ ...prev, [problem.id]: data }));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setStatus("idle");
    }
  }

  handleSubmitRef.current = handleSubmit;
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmitRef.current(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const passedCount = Object.values(allResults).filter((r) => r.passed).length;

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo"><span className="logo-real">Real</span><span className="logo-dev">Dev</span></span>
          <div className="header-divider" />
          <span className="header-context">Backend Track · Rust</span>
        </div>
        <div className="header-center">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(passedCount / PROBLEMS.length) * 100}%` }} />
          </div>
          <span className="progress-label">{passedCount}/{PROBLEMS.length} solved</span>
        </div>
        <div className="header-right">
          <div className="user-chip">
            <span className="user-avatar">{username[0].toUpperCase()}</span>
            <span className="user-name">{username}</span>
          </div>
          <button className="logout-btn" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div className="main">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-label">Backlog</div>
          {PROBLEMS.map((p, i) => {
            const r = allResults[p.id];
            const statusClass = r ? (r.passed ? "done" : "failed") : "";
            return (
              <div key={p.id} className={`ticket-item${i === problemIdx ? " active" : ""} ${statusClass}`} onClick={() => selectProblem(i)}>
                <div className="ticket-top">
                  <span className="ticket-id">{p.ticket}</span>
                  <span className={`ticket-status ${statusClass}`}>
                    {r ? (r.passed ? "✓ Done" : "✗ Failed") : "Open"}
                  </span>
                </div>
                <div className="ticket-title">{p.title}</div>
                <DiffBadge level={p.difficulty} />
              </div>
            );
          })}
        </aside>

        {/* Ticket Description */}
        <section className="description">
          <div className="ticket-header">
            <div className="ticket-meta">
              <span className="ticket-number">{problem.ticket}</span>
              <DiffBadge level={problem.difficulty} />
              {problem.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
            <h1 className="ticket-main-title">{problem.title}</h1>
          </div>

          <div className="ticket-section">
            <div className="section-label">Description</div>
            <p className="ticket-desc">{problem.description}</p>
          </div>

          <div className="ticket-section">
            <div className="section-label">Schema</div>
            <pre className="code-block">{problem.schema}</pre>
          </div>

          <div className="ticket-section">
            <div className="section-label">Expected</div>
            <pre className="code-block accent">{problem.expected}</pre>
          </div>

          <div className="ticket-section">
            <div className="section-label">Environment</div>
            <div className="env-vars">
              <div className="env-row"><code>DATABASE_URL</code><span>PostgreSQL connection string</span></div>
              <div className="env-row"><code>PORT</code><span>Port to listen on</span></div>
            </div>
          </div>
        </section>

        {/* Editor */}
        <section className="editor-panel">
          <div className="editor-toolbar">
            <div className="editor-toolbar-left">
              <span className="file-dot" />
              <span className="editor-filename">solution.rs</span>
              <span className="lang-badge">Rust</span>
            </div>
            <div className="editor-toolbar-right">
              <span className="shortcut-hint">⌘↵ to run</span>
              <button
                className={`run-btn${status === "submitting" ? " running" : ""}`}
                onClick={handleSubmit}
                disabled={status === "submitting"}
              >
                {status === "submitting" ? <><span className="run-spinner" />Grading…</> : <>▶ Run</>}
              </button>
            </div>
          </div>
          <div className="editor-body">
            <Editor
              key={problem.id}
              height="100%"
              defaultLanguage="rust"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme="vs-dark"
              options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 16 }, fontFamily: "'Fira Code', 'Cascadia Code', monospace", fontLigatures: true }}
            />
          </div>
        </section>

        {/* Results + DB panel */}
        <section className="results-panel">
          <div className="results-header">
            <div className="panel-tabs">
              <button className={`panel-tab${rightTab === "output" ? " active" : ""}`} onClick={() => setRightTab("output")}>
                Output
                {result && <span className={`tab-dot ${result.passed ? "pass" : "fail"}`} />}
              </button>
              <button className={`panel-tab${rightTab === "database" ? " active" : ""}`} onClick={() => setRightTab("database")}>
                Database
              </button>
            </div>
          </div>

          {rightTab === "output" && (
            <>
              {status === "submitting" && (
                <div className="grading-state">
                  <div className="grading-steps">
                    <GradingStep label="Compiling" active />
                    <GradingStep label="Seeding DB" />
                    <GradingStep label="Running tests" />
                  </div>
                </div>
              )}
              {error && !result && <div className="result-error">{error}</div>}
              {!result && status === "idle" && !error && (
                <div className="results-empty">
                  <div className="empty-icon">▶</div>
                  <p>Run your code to see results</p>
                  <p className="empty-hint">Press ⌘↵ or click Run</p>
                </div>
              )}
              {result && (
                <div className="results-body">
                  <div className={`score-banner ${result.passed ? "pass" : "fail"}`}>
                    <span className="score-icon">{result.passed ? "✓" : "✗"}</span>
                    <span className="score-text">
                      {result.passed ? "All tests passed" : `${result.tests_passed} of ${result.tests_total} passed`}
                    </span>
                  </div>
                  {result.compile_error && (
                    <div className="result-block error">
                      <div className="result-block-label">Compile Error</div>
                      <pre className="result-pre">{result.compile_error}</pre>
                    </div>
                  )}
                  {result.test_details.map((t, i) => (
                    <div key={t.name} className={`test-card ${t.passed ? "pass" : "fail"}`} style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="test-card-header">
                        <span className={`test-icon ${t.passed ? "pass" : "fail"}`}>{t.passed ? "✓" : "✗"}</span>
                        <span className="test-card-name">{t.name}</span>
                      </div>
                      {!t.passed && (
                        <div className="test-card-diff">
                          <div className="diff-block expected">
                            <span className="diff-block-label">Expected</span>
                            <pre>{t.expected}</pre>
                          </div>
                          <div className="diff-block got">
                            <span className="diff-block-label">Got</span>
                            <pre>{t.actual || "(empty)"}</pre>
                          </div>
                          {t.message && <pre className="diff-stderr">{t.message}</pre>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {rightTab === "database" && (
            <DbViewer table={problem.tables[0]} token={token} />
          )}
        </section>
      </div>
    </div>
  );
}

function GradingStep({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className={`grading-step${active ? " active" : ""}`}>
      <span className="grading-dot" />
      <span>{label}</span>
    </div>
  );
}
