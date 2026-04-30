import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import "./App.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface TestCaseResult {
  name: string;
  method: string;
  path: string;
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

interface TestCaseSummary {
  name: string;
  method: string;
  path: string;
  body: string | null;
  expected_status: number;
  expected_json: string;
}

interface Problem {
  id: string;
  ticket: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  tables: string[];
  description: string;
  schema_sql: string;
  expected_display: string;
  starter: string;
  test_cases: TestCaseSummary[];
}

interface DbRow { id: number; name: string; }

// ─── DB Viewer ───────────────────────────────────────────────────────────────

function DbViewer({ table, token }: { table: string; token: string }) {
  const [rows, setRows] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchRows() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/db/${table}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRows(); }, [table]);

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
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="db-id">{row.id}</td>
                <td>{row.name}</td>
              </tr>
            ))}
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/${tab}`, {
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

// ─── Problem list hook ────────────────────────────────────────────────────────

function useProblemList(): { problems: Problem[]; loadError: string | null } {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/problems`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Problem[]) => setProblems(data))
      .catch((e) => setLoadError(e.message ?? "Failed to load problems"));
  }, []);

  return { problems, loadError };
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function MainApp({ token, username, onLogout }: { token: string; username: string; onLogout: () => void }) {
  const { problems, loadError } = useProblemList();
  const [problemIdx, setProblemIdx] = useState(0);

  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (problems.length === 0) return;
    setCodes((prev) => {
      const next = { ...prev };
      for (const p of problems) {
        if (!next[p.id]) next[p.id] = p.starter;
      }
      return next;
    });
  }, [problems]);

  const problem = problems[problemIdx];
  const code = problem ? (codes[problem.id] ?? "") : "";

  function setCode(val: string) {
    if (!problem) return;
    setCodes((prev) => ({ ...prev, [problem.id]: val }));
  }

  const [allResults, setAllResults] = useState<Record<string, GradeResult>>({});
  const result = problem ? (allResults[problem.id] ?? null) : null;

  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"output" | "testcases" | "database">("output");
  const handleSubmitRef = useRef<() => void>(() => {});

  function selectProblem(i: number) {
    setProblemIdx(i);
    setError(null);
  }

  async function handleSubmit() {
    if (status === "submitting" || !problem) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch(`${API}/submit`, {
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
        setRightTab("output");
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

  if (loadError) {
    return (
      <div className="results-empty">
        <div className="empty-icon">✗</div>
        <p>Failed to load problems</p>
        <p className="empty-hint">{loadError} — is the grader running?</p>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="results-empty">
        <div className="empty-icon">…</div>
        <p>Loading problems…</p>
      </div>
    );
  }

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
            <div className="progress-fill" style={{ width: `${(passedCount / problems.length) * 100}%` }} />
          </div>
          <span className="progress-label">{passedCount}/{problems.length} solved</span>
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
          {problems.map((p, i) => {
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
            <pre className="code-block">{problem.schema_sql}</pre>
          </div>

          <div className="ticket-section">
            <div className="section-label">Expected</div>
            <pre className="code-block accent">{problem.expected_display}</pre>
          </div>

          <div className="ticket-section">
            <div className="section-label">Test Cases</div>
            <div className="tc-list">
              {problem.test_cases.map((tc) => (
                <div key={tc.name} className="tc-preview">
                  <div className="tc-preview-header">
                    <span className={`method-badge method-${tc.method.toLowerCase()}`}>{tc.method}</span>
                    <code className="tc-preview-path">{tc.path}</code>
                    <span className="tc-preview-status">→ {tc.expected_status}</span>
                  </div>
                  {tc.body && (
                    <pre className="tc-preview-block">Body: {tc.body}</pre>
                  )}
                  <pre className="tc-preview-block">{tc.expected_json}</pre>
                </div>
              ))}
            </div>
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
              <button className={`panel-tab${rightTab === "testcases" ? " active" : ""}`} onClick={() => setRightTab("testcases")}>
                Test Cases
                <span className="tab-count">{problem.test_cases.length}</span>
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
                  {result.runtime_error && (
                    <div className="result-block error">
                      <div className="result-block-label">Runtime Error</div>
                      <pre className="result-pre">{result.runtime_error}</pre>
                    </div>
                  )}
                  {result.test_details.map((t, i) => (
                    <div key={t.name} className={`test-card ${t.passed ? "pass" : "fail"}`} style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="test-card-header">
                        <span className={`test-icon ${t.passed ? "pass" : "fail"}`}>{t.passed ? "✓" : "✗"}</span>
                        <span className="test-card-name">{t.name}</span>
                      </div>
                      <div className="test-card-endpoint">
                        <span className={`method-badge method-${t.method.toLowerCase()}`}>{t.method}</span>
                        <code className="test-card-path">{t.path}</code>
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

          {rightTab === "testcases" && (
            <div className="tc-panel-list">
              {problem.test_cases.map((tc) => {
                const tcResult = result?.test_details.find((td) => td.name === tc.name);
                return (
                  <div key={tc.name} className={`tc-panel-card${tcResult ? (tcResult.passed ? " pass" : " fail") : ""}`}>
                    <div className="tc-panel-header">
                      <span className={`method-badge method-${tc.method.toLowerCase()}`}>{tc.method}</span>
                      <code className="tc-panel-path">{tc.path}</code>
                      <span className="tc-panel-status">→ {tc.expected_status}</span>
                      {tcResult && <span className={`tc-panel-result ${tcResult.passed ? "pass" : "fail"}`}>{tcResult.passed ? "✓" : "✗"}</span>}
                    </div>
                    {tc.body && (
                      <pre className="tc-panel-block">Body: {tc.body}</pre>
                    )}
                    <pre className="tc-panel-block">{tc.expected_json}</pre>
                  </div>
                );
              })}
            </div>
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
