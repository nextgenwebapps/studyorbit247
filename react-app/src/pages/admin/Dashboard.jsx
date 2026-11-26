import { useEffect, useRef, useState } from "react";
import { mount } from "../../mount.jsx";
import { api } from "./lib/api.js";
import { requireAdmin, signOut } from "./lib/auth.js";
import { API_BASE, STORAGE_KEY } from "./lib/config.js";
import { validateQuestion, typeLabel } from "./lib/question-model.js";
import { newQuestion, QuestionBuilder, QuestionPreview } from "./QuestionBuilder.jsx";

const titles = {
  overview: "Overview",
  questions: "Question bank",
  create: "Add questions",
  review: "Review & publish",
  storage: "R2 storage",
  taxonomy: "Taxonomy & IDs",
};

function readDrafts() {
  try {
    const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(drafts) ? drafts : [];
  } catch {
    return [];
  }
}

function QuestionRow({ question, children, review = false, detail }) {
  return (
    <article className={review ? "question-row review-row" : "question-row"}>
      <div>
        <strong>{question.question?.en || "Untitled question"}</strong>
        <small>
          {typeLabel(question.type)} · {question.subject || "No subject"}
          {detail && ` · ${detail}`}
        </small>
      </div>
      {children}
    </article>
  );
}

function Dashboard() {
  const [session, setSession] = useState(null);
  const [drafts, setDrafts] = useState(readDrafts);
  const [published, setPublished] = useState([]);
  const [view, setView] = useState("overview");
  const [sidebar, setSidebar] = useState(false);
  const [mode, setMode] = useState("single");
  const [device, setDevice] = useState("mobile");
  const [question, setQuestion] = useState(newQuestion);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [validation, setValidation] = useState(null);
  const [toast, setToast] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState("question-bank");
  const [uploadPath, setUploadPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadResult, setUploadResult] = useState("");
  const [uploadHistory, setUploadHistory] = useState([]);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [taxonomy, setTaxonomy] = useState([]);
  const [taxonomyError, setTaxonomyError] = useState("");
  const [taxonomyMessage, setTaxonomyMessage] = useState("");
  const [taxForm, setTaxForm] = useState({ kind: "subject", parentId: "", code: "", nameEn: "", nameHi: "" });
  const [idForm, setIdForm] = useState({ subjectCode: "", chapterCode: "", topicCode: "", level: "E" });
  const [allocatedId, setAllocatedId] = useState(null);
  const toastTimer = useRef();

  useEffect(() => {
    let active = true;
    requireAdmin()
      .then(async (user) => {
        const items = await api.getPublished();
        if (active) {
          setSession(user);
          setPublished(items);
        }
      })
      .catch(() => {
        /* requireAdmin redirects to sign-in. */
      });
    return () => {
      active = false;
      clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!session || view !== "storage") return;
    let active = true;
    Promise.all([api.getUploadHistory(30), api.getQuestionHistory(30)])
      .then(([uploads, changes]) => {
        if (!active) return;
        setUploadHistory(uploads.uploads || []);
        setQuestionHistory(changes.changes || []);
        setHistoryError("");
      })
      .catch((error) => {
        if (active) setHistoryError(error.message || "Could not load audit history.");
      });
    return () => { active = false; };
  }, [session, view, uploadResult]);

  useEffect(() => {
    if (!session || view !== "taxonomy") return;
    let active = true;
    api.getTaxonomy()
      .then((data) => { if (active) { setTaxonomy(data.taxonomy || []); setTaxonomyError(""); } })
      .catch((error) => { if (active) setTaxonomyError(error.message || "Could not load taxonomy."); });
    return () => { active = false; };
  }, [session, view]);

  async function saveTaxonomy(event) {
    event.preventDefault();
    setTaxonomyMessage("");
    try {
      await api.createTaxonomy(taxForm);
      const data = await api.getTaxonomy();
      setTaxonomy(data.taxonomy || []);
      setTaxonomyMessage("Taxonomy code saved.");
      setTaxForm((current) => ({ ...current, parentId: "", code: "", nameEn: "", nameHi: "" }));
    } catch (error) {
      setTaxonomyMessage(error.message || "Could not save taxonomy code.");
    }
  }

  async function allocateQuestionId(event) {
    event.preventDefault();
    setAllocatedId(null);
    try {
      setAllocatedId(await api.nextQuestionId(idForm));
    } catch (error) {
      setTaxonomyMessage(error.message || "Could not allocate question ID.");
    }
  }

  const ready = drafts.filter((item) => validateQuestion(item).length === 0);
  const filtered = drafts.filter(
    (item) =>
      (item.question?.en || "").toLowerCase().includes(search.trim().toLowerCase()) &&
      (status === "all" || (ready.includes(item) ? "ready" : "draft") === status) &&
      (type === "all" || item.type === type),
  );

  function notify(message) {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function store(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setDrafts(items);
  }

  function withCurrent(items) {
    return [...items.filter((item) => item.id !== question.id), question];
  }

  function navigate(next, nextMode) {
    setView(next);
    setSidebar(false);
    if (nextMode && nextMode !== mode) {
      if (mode === "single" && dirty) store(withCurrent(drafts));
      setDirty(false);
      setMode(nextMode);
      setQuestion(newQuestion());
      setValidation(null);
    }
  }

  function edit(item) {
    if (dirty && item.id !== question.id) store(withCurrent(drafts));
    setView("create");
    setMode("single");
    setQuestion(item);
    setDirty(false);
    setValidation(null);
  }

  function update(item) {
    setQuestion(item);
    setDirty(true);
    setValidation(null);
  }

  function importQuestions(items) {
    const byId = new Map(drafts.map((item) => [item.id, item]));
    items.forEach((item) => byId.set(item.id, item));
    store([...byId.values()]);
    if (mode === "bulk") notify(`${items.length} questions imported`);
  }

  function remove(item) {
    if (!window.confirm("Delete this local draft?")) return;
    store(drafts.filter((draft) => draft.id !== item.id));
    if (item.id === question.id) {
      setQuestion(newQuestion());
      setDirty(false);
    }
  }

  function validate() {
    const items = mode === "single" ? withCurrent(drafts) : drafts;
    const issues = items
      .map((item, index) => ({ index, errors: validateQuestion(item) }))
      .filter((item) => item.errors.length);
    setValidation({ total: items.length, issues });
  }

  async function save() {
    const items = mode === "single" ? withCurrent(drafts) : drafts;
    if (!items.length) return notify("Add at least one question first.");
    try {
      const result = await api.saveDrafts(items);
      setDrafts(result.questions);
      setDirty(false);
      notify(`${items.length} question(s) saved in this browser.`);
    } catch (error) {
      notify(error.message);
    }
  }

  async function publish(ids) {
    if (!ids.length) return notify("No validated questions selected.");
    if (
      !window.confirm(
        "Demo publish selected questions in this browser only? They will NOT go live on StudyOrbit247.",
      )
    )
      return;
    try {
      const result = await api.publish(ids);
      setDrafts(readDrafts());
      setPublished(await api.getPublished());
      if (ids.includes(question.id) && !dirty) setQuestion(newQuestion());
      notify(`${result.count} question(s) marked as demo-published locally.`);
    } catch (error) {
      notify(error.message);
    }
  }


  async function uploadToR2() {
    if (!uploadFile) return notify("Choose a file first.");
    if (uploadFile.size < 1) return notify("The selected file is empty.");
    const maxBytes = 500 * 1024 * 1024;
    if (uploadFile.size > maxBytes) return notify("Maximum supported file size is 500 MiB.");
    const relativePath = (uploadPath.trim() || uploadFile.name).split("/").filter(Boolean).join("/");
    const key = uploadType + "/" + relativePath;
    let uploadId;
    setUploading(true);
    setUploadProgress("Preparing secure upload…");
    setUploadResult("");
    try {
      const started = await api.startUpload({
        key,
        size: uploadFile.size,
        contentType: uploadFile.type || "application/octet-stream",
        fileName: uploadFile.name,
      });
      uploadId = started.uploadId;
      const chunkSize = 8 * 1024 * 1024;
      const parts = [];
      const count = Math.ceil(uploadFile.size / chunkSize);
      for (let index = 0; index < count; index += 1) {
        const partNumber = index + 1;
        const chunk = uploadFile.slice(index * chunkSize, Math.min((index + 1) * chunkSize, uploadFile.size));
        const result = await api.uploadPart({ key, uploadId, partNumber, body: chunk });
        parts.push({ partNumber, etag: result.etag });
        setUploadProgress("Uploading part " + partNumber + " of " + count + " · " + Math.round((partNumber / count) * 100) + "%");
      }
      const completion = await api.completeUpload({ key, uploadId, parts });
      let resultMessage = completion.status === "completed_unverified"
        ? "File uploaded to R2, but the question JSON needs fixing before verification: " + key
        : "Upload recorded: " + (completion.questionCount ?? "file") + " questions at " + key + ". Added " + completion.changes.added + ", updated " + completion.changes.updated + ", removed " + completion.changes.removed + ".";
      const workerOrigin = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
      const publicUrl = workerOrigin + "/api/content/" + key.split("/").map(encodeURIComponent).join("/") + "?verify=" + Date.now();
      try {
        const check = await fetch(publicUrl, { method: "HEAD", cache: "no-store" });
        if (!check.ok) {
          resultMessage += " — upload finished, but the public read check returned " + check.status + ".";
        } else if (key.toLowerCase().endsWith(".json") && uploadFile.size <= 10 * 1024 * 1024) {
          const response = await fetch(publicUrl, { cache: "no-store" });
          const data = await response.json().catch(() => null);
          resultMessage = Array.isArray(data?.questions)
            ? "Verified in R2: " + data.questions.length + " questions at " + key + ". Added " + completion.changes.added + ", updated " + completion.changes.updated + ", removed " + completion.changes.removed + (completion.status === "completed_with_issues" ? ". Review the flagged items in upload history." : "")
            : "Uploaded to R2, but this JSON has no top-level questions list: " + key;
        } else {
          resultMessage = "Verified in R2: " + key;
        }
      } catch {
        resultMessage += " — upload completed, but automatic verification could not run.";
      }
      setUploadResult(resultMessage);
      setUploadProgress("");
      setUploadFile(null);
      setUploadPath("");
      const input = document.getElementById("r2-file");
      if (input) input.value = "";
      notify(resultMessage);
    } catch (error) {
      if (uploadId) {
        try { await api.abortUpload({ key, uploadId }); } catch { /* Keep the original error. */ }
      }
      setUploadProgress("");
      notify(error.message);
    } finally {
      setUploading(false);
    }
  }

  if (!session) return null;

  return (
    <>
      <div className="app-shell">
        <aside className={sidebar ? "sidebar open" : "sidebar"} id="sidebar">
          <a className="admin-brand" href="../">
            Study<span>Orbit</span>247
          </a>
          <div className="side-caption">ADMIN WORKSPACE</div>
          <nav>
            <button
              className={view === "overview" ? "nav-link active" : "nav-link"}
              onClick={() => navigate("overview")}
            >
              ▦ <span>Overview</span>
            </button>
            <button
              className={view === "questions" ? "nav-link active" : "nav-link"}
              onClick={() => navigate("questions")}
            >
              ▤ <span>Question bank</span>
            </button>
            <button
              className={view === "create" ? "nav-link active" : "nav-link"}
              onClick={() => navigate("create")}
            >
              ＋ <span>Add questions</span>
            </button>
            <button
              className={view === "review" ? "nav-link active" : "nav-link"}
              onClick={() => navigate("review")}
            >
              ✓ <span>Review & publish</span>
            </button>
            <button
              className={view === "taxonomy" ? "nav-link active" : "nav-link"}
              onClick={() => navigate("taxonomy")}
            >
              # <span>Taxonomy & IDs</span>
            </button>
            <button
              className={view === "storage" ? "nav-link active" : "nav-link"}
              onClick={() => navigate("storage")}
            >
              ⇧ <span>R2 storage</span>
            </button>
          </nav>
          <div className="sidebar-bottom">
            <div className="admin-user">
              <div className="avatar">A</div>
              <div>
                <b>Administrator</b>
                <small id="admin-email-label">{session.email} · Secure</small>
              </div>
            </div>
            <button id="logout" onClick={signOut} className="nav-link logout">
              ↪ <span>Sign out</span>
            </button>
          </div>
        </aside>
        <main className="main-area">
          <header className="top-header">
            <button
              className="icon-button mobile-menu"
              id="menu-toggle"
              onClick={() => setSidebar(!sidebar)}
              aria-expanded={sidebar}
              aria-controls="sidebar"
              aria-label="Open menu"
            >
              ☰
            </button>
            <div>
              <div className="breadcrumb">
                StudyOrbit247 <span>/</span> <b id="page-title">{titles[view]}</b>
              </div>
              <div className="header-subtitle">Question management workspace</div>
            </div>
            <div className="header-right">
              <span className="status-dot">● Secure admin · R2 upload</span>
              <div className="avatar">A</div>
            </div>
          </header>
          <div className="content-area">
            <section className={view === "overview" ? "view active" : "view"} id="view-overview">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">WORKSPACE</div>
                  <h1>Admin overview</h1>
                  <p className="muted">Create, validate, review and publish exam questions.</p>
                </div>
                <button className="primary" onClick={() => navigate("create")}>
                  ＋ Add questions
                </button>
              </div>
              <div className="stats-grid">
                <article className="stat-card">
                  <span>Total drafts</span>
                  <strong id="stat-drafts">{drafts.length}</strong>
                  <small>Saved in this browser</small>
                </article>
                <article className="stat-card">
                  <span>Ready for review</span>
                  <strong id="stat-ready">{ready.length}</strong>
                  <small>Passed local checks</small>
                </article>
                <article className="stat-card">
                  <span>Needs attention</span>
                  <strong id="stat-errors">{drafts.length - ready.length}</strong>
                  <small>Validation issues</small>
                </article>
                <article className="stat-card">
                  <span>Published</span>
                  <strong id="stat-published">{published.length}</strong>
                  <small>Demo-published locally</small>
                </article>
              </div>
              <div className="panel-grid">
                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Quick actions</h2>
                      <p className="muted">Choose how you want to add questions.</p>
                    </div>
                  </div>
                  <div className="quick-grid">
                    <button className="quick-action" onClick={() => navigate("create", "single")}>
                      <b>＋</b>
                      <strong>Single question</strong>
                      <small>Create one question</small>
                    </button>
                    <button className="quick-action" onClick={() => navigate("create", "multiple")}>
                      <b>▤</b>
                      <strong>Multiple questions</strong>
                      <small>Add a set in one session</small>
                    </button>
                    <button className="quick-action" onClick={() => navigate("create", "bulk")}>
                      <b>⇧</b>
                      <strong>Bulk import</strong>
                      <small>CSV or JSON file</small>
                    </button>
                    <button className="quick-action" onClick={() => navigate("create", "group")}>
                      <b>▧</b>
                      <strong>Passage / chart set</strong>
                      <small>Shared content + questions</small>
                    </button>
                  </div>
                </article>
                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Publishing workflow</h2>
                      <p className="muted">Nothing goes live without approval.</p>
                    </div>
                  </div>
                  <ol className="workflow">
                    <li>
                      <i>1</i>
                      <span>
                        <b>Create or import</b>
                        <small>Single, multiple or bulk</small>
                      </span>
                    </li>
                    <li>
                      <i>2</i>
                      <span>
                        <b>Validate bilingual content</b>
                        <small>Check fields, answers and structure</small>
                      </span>
                    </li>
                    <li>
                      <i>3</i>
                      <span>
                        <b>Preview devices</b>
                        <small>Mobile and desktop layouts</small>
                      </span>
                    </li>
                    <li>
                      <i>4</i>
                      <span>
                        <b>Approve and publish</b>
                        <small>Server-side permission required</small>
                      </span>
                    </li>
                  </ol>
                </article>
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent drafts</h2>
                    <p className="muted">Questions saved on this device.</p>
                  </div>
                  <button className="text-button" onClick={() => navigate("questions")}>
                    View all →
                  </button>
                </div>
                <div id="recent-drafts" className={drafts.length ? "question-list" : "empty-state"}>
                  {drafts.length
                    ? drafts
                        .slice(-5)
                        .reverse()
                        .map((item) => (
                          <QuestionRow key={item.id} question={item}>
                            <span className="draft-pill">Draft</span>
                          </QuestionRow>
                        ))
                    : "No drafts yet. Start by adding a question."}
                </div>
              </div>
            </section>
            <section className={view === "questions" ? "view active" : "view"} id="view-questions">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CONTENT LIBRARY</div>
                  <h1>Question bank</h1>
                  <p className="muted">Manage drafts created in this browser.</p>
                </div>
                <button className="primary" onClick={() => navigate("create")}>
                  ＋ Add questions
                </button>
              </div>
              <div className="toolbar">
                <input
                  id="question-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search questions…"
                  aria-label="Search questions"
                />
                <select
                  id="status-filter"
                  aria-label="Filter by status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="ready">Ready for review</option>
                </select>
                <select
                  id="type-filter"
                  aria-label="Filter by question type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  <option value="all">All types</option>
                  {[...new Set(drafts.map((item) => item.type))].map((value) => (
                    <option key={value} value={value}>
                      {typeLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div id="question-list" className="question-list">
                {filtered.length ? (
                  filtered.map((item) => (
                    <QuestionRow
                      key={item.id}
                      question={item}
                      detail={ready.includes(item) ? "Ready for review" : "Needs attention"}
                    >
                      <div className="review-actions">
                        <button className="text-button" onClick={() => edit(item)}>
                          Edit
                        </button>
                        <button className="text-button" onClick={() => remove(item)}>
                          Delete
                        </button>
                      </div>
                    </QuestionRow>
                  ))
                ) : (
                  <div className="empty-state">No matching questions.</div>
                )}
              </div>
            </section>
            <section className={view === "create" ? "view active" : "view"} id="view-create">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">QUESTION CREATION</div>
                  <h1>Add questions</h1>
                  <p className="muted">
                    Choose a format, enter English and Hindi, then preview before approval.
                  </p>
                </div>
                <span className="draft-pill">Draft workspace</span>
              </div>
              <div className="mode-tabs" id="mode-tabs">
                <button
                  className={mode === "single" ? "selected" : ""}
                  onClick={() => navigate("create", "single")}
                >
                  Single
                </button>
                <button
                  className={mode === "multiple" ? "selected" : ""}
                  onClick={() => navigate("create", "multiple")}
                >
                  Multiple
                </button>
                <button
                  className={mode === "group" ? "selected" : ""}
                  onClick={() => navigate("create", "group")}
                >
                  Passage / chart set
                </button>
                <button
                  className={mode === "bulk" ? "selected" : ""}
                  onClick={() => navigate("create", "bulk")}
                >
                  Bulk import
                </button>
              </div>
              <div className="builder-layout">
                <div className="builder-main">
                  <div className="panel" id="builder-panel">
                    <div id="builder-content">
                      <QuestionBuilder
                        key={mode}
                        mode={mode}
                        question={question}
                        onChange={update}
                        drafts={drafts}
                        onImport={importQuestions}
                        onEdit={edit}
                      />
                    </div>
                  </div>
                  <div className="builder-actions">
                    <button className="secondary" id="validate-btn" onClick={validate}>
                      Validate questions
                    </button>
                    <button className="primary" id="save-drafts-btn" onClick={save}>
                      Save drafts
                    </button>
                  </div>
                  <div id="validation-results" className="validation-box" hidden={!validation}>
                    {validation &&
                      (validation.issues.length ? (
                        <>
                          <b className="bad">{validation.issues.length} question(s) need attention</b>
                          {validation.issues.map(({ index, errors }) => (
                            <p key={index}>
                              Question {index + 1}: {errors.join(" ")}
                            </p>
                          ))}
                        </>
                      ) : (
                        <>
                          <b className="ok">
                            All {validation.total} saved questions passed the basic checks.
                          </b>
                          <p>
                            Human review is still recommended for translation accuracy and answer correctness.
                          </p>
                        </>
                      ))}
                  </div>
                </div>
                <aside className="preview-panel">
                  <div className="preview-head">
                    <div>
                      <b>Live preview</b>
                      <small>Same responsive question card concept</small>
                    </div>
                    <div className="device-switch">
                      <button
                        className={device === "mobile" ? "selected" : ""}
                        onClick={() => setDevice("mobile")}
                      >
                        Mobile
                      </button>
                      <button
                        className={device === "desktop" ? "selected" : ""}
                        onClick={() => setDevice("desktop")}
                      >
                        Desktop
                      </button>
                    </div>
                  </div>
                  <QuestionPreview question={mode === "single" ? question : null} device={device} />
                </aside>
              </div>
            </section>

            <section className={view === "taxonomy" ? "view active" : "view"} id="view-taxonomy">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">QUESTION STRUCTURE</div>
                  <h1>Taxonomy & question IDs</h1>
                  <p className="muted">Create controlled subject, chapter and topic codes. The allocator reserves a unique number from 000001 to 999999 for each topic.</p>
                </div>
              </div>
              <div className="panel-grid">
                <article className="panel">
                  <div className="panel-heading"><div><h2>Add a taxonomy code</h2><p className="muted">Use short codes without spaces, such as GK, POL or FR.</p></div></div>
                  <form className="field-grid" onSubmit={saveTaxonomy}>
                    <label className="field">Type
                      <select value={taxForm.kind} onChange={(event) => setTaxForm((current) => ({ ...current, kind: event.target.value, parentId: "" }))}>
                        <option value="subject">Subject</option><option value="chapter">Chapter</option><option value="topic">Topic</option>
                      </select>
                    </label>
                    {taxForm.kind !== "subject" && <label className="field">Parent
                      <select required value={taxForm.parentId} onChange={(event) => setTaxForm((current) => ({ ...current, parentId: event.target.value }))}>
                        <option value="">Select parent</option>
                        {taxonomy.filter((item) => item.kind === (taxForm.kind === "chapter" ? "subject" : "chapter") && item.is_active).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name_en}</option>)}
                      </select>
                    </label>}
                    <label className="field">Code
                      <input required maxLength={8} pattern="[A-Za-z0-9]{2,8}" value={taxForm.code} onChange={(event) => setTaxForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="e.g. GK, POL, FR" />
                    </label>
                    <label className="field">English name
                      <input required maxLength={120} value={taxForm.nameEn} onChange={(event) => setTaxForm((current) => ({ ...current, nameEn: event.target.value }))} />
                    </label>
                    <label className="field">Hindi name (optional)
                      <input maxLength={120} value={taxForm.nameHi} onChange={(event) => setTaxForm((current) => ({ ...current, nameHi: event.target.value }))} />
                    </label>
                    <button className="primary" type="submit">Save code</button>
                  </form>
                  {taxonomyMessage && <p role="status">{taxonomyMessage}</p>}
                  {taxonomyError && <p role="status">{taxonomyError}</p>}
                </article>
                <article className="panel">
                  <div className="panel-heading"><div><h2>Reserve a question ID</h2><p className="muted">Each reserved number is permanent and is never reused.</p></div></div>
                  <form className="field-grid" onSubmit={allocateQuestionId}>
                    <label className="field">Subject
                      <select required value={idForm.subjectCode} onChange={(event) => setIdForm((current) => ({ ...current, subjectCode: event.target.value, chapterCode: "", topicCode: "" }))}>
                        <option value="">Select subject</option>
                        {taxonomy.filter((item) => item.kind === "subject" && item.is_active).map((item) => <option key={item.id} value={item.code}>{item.code} — {item.name_en}</option>)}
                      </select>
                    </label>
                    <label className="field">Chapter
                      <select required value={idForm.chapterCode} onChange={(event) => setIdForm((current) => ({ ...current, chapterCode: event.target.value, topicCode: "" }))}>
                        <option value="">Select chapter</option>
                        {taxonomy.filter((item) => item.kind === "chapter" && item.parent_id === taxonomy.find((node) => node.kind === "subject" && node.code === idForm.subjectCode)?.id && item.is_active).map((item) => <option key={item.id} value={item.code}>{item.code} — {item.name_en}</option>)}
                      </select>
                    </label>
                    <label className="field">Topic
                      <select required value={idForm.topicCode} onChange={(event) => setIdForm((current) => ({ ...current, topicCode: event.target.value }))}>
                        <option value="">Select topic</option>
                        {taxonomy.filter((item) => item.kind === "topic" && item.parent_id === taxonomy.find((node) => node.kind === "chapter" && node.code === idForm.chapterCode && node.parent_id === taxonomy.find((n) => n.kind === "subject" && n.code === idForm.subjectCode)?.id)?.id && item.is_active).map((item) => <option key={item.id} value={item.code}>{item.code} — {item.name_en}</option>)}
                      </select>
                    </label>
                    <label className="field">Level
                      <select value={idForm.level} onChange={(event) => setIdForm((current) => ({ ...current, level: event.target.value }))}>
                        <option value="E">Easy</option><option value="M">Medium</option><option value="H">Hard</option>
                      </select>
                    </label>
                    <button className="primary" type="submit">Generate next ID</button>
                  </form>
                  {allocatedId && <div className="notice-card"><b>{allocatedId.questionId}</b><p>Internal record ID: {allocatedId.recordId}</p><small>Copy both IDs into the question record. The sequence is reserved for this topic.</small></div>}
                </article>
              </div>
              <article className="panel">
                <div className="panel-heading"><div><h2>Registered codes</h2><p className="muted">Names can change; codes remain stable.</p></div></div>
                <div className={taxonomy.length ? "question-list" : "empty-state"}>
                  {taxonomy.length ? taxonomy.map((item) => <div className="question-row" key={item.id}><div><strong>{item.code} — {item.name_en}</strong><small>{item.kind}{item.name_hi ? " · " + item.name_hi : ""}{item.is_active ? "" : " · inactive"}</small></div></div>) : "Add a subject, then its chapters and topics."}
                </div>
              </article>
            </section>
            <section className={view === "storage" ? "view active" : "view"} id="view-storage">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CLOUDFLARE R2</div>
                  <h1>Upload content</h1>
                  <p className="muted">Files upload through the secure Worker into the StudyOrbit247 bucket and are checked after upload.</p>
                </div>
              </div>
              <article className="panel r2-upload-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Secure file upload</h2>
                    <p className="muted">R2 credentials stay on Cloudflare. The browser only uses the secure admin session.</p>
                  </div>
                </div>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="r2-type">Storage folder</label>
                    <select id="r2-type" value={uploadType} disabled={uploading} onChange={(event) => { setUploadType(event.target.value); setUploadPath(""); }}>
                      <option value="question-bank">Question bank</option>
                      <option value="media">Media</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="r2-path">File path inside folder (optional)</label>
                    <input id="r2-path" value={uploadPath} disabled={uploading} onChange={(event) => setUploadPath(event.target.value)} placeholder={uploadType === "question-bank" ? "studyorbit-gk-100-questions.json" : "gk/river-map.png"} />
                    <small>Type only the path after the selected folder. Do not type “question-bank/” here.</small>
                  </div>
                  <div className="field full-width">
                    <label htmlFor="r2-file">Choose file (up to 500 MiB)</label>
                    <input id="r2-file" type="file" disabled={uploading} onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
                  </div>
                </div>
                <p className="import-help">
                  Destination: <code>{uploadType}/{uploadPath.trim() || uploadFile?.name || "your-file"}</code>. For the current 100-question GK file, leave the path empty and select that JSON; it uploads as <code>question-bank/studyorbit-gk-100-questions.json</code>. Large files upload in 8 MiB parts.
                </p>
                {uploadProgress && <div className="upload-progress" role="status">{uploadProgress}</div>}
                {uploadResult && <p className="import-help" role="status">{uploadResult}</p>}
                <button className="primary" type="button" onClick={uploadToR2} disabled={uploading || !uploadFile}>
                  {uploading ? "Uploading…" : "Upload to R2"}
                </button>
              </article>
              <article className="panel">
                <div className="panel-heading"><div><h2>R2 upload history</h2><p className="muted">Who uploaded each object, when, and how the question count changed.</p></div></div>
                {historyError && <p role="status" className="muted">{historyError}</p>}
                <div className={uploadHistory.length ? "question-list" : "empty-state"}>
                  {uploadHistory.length ? uploadHistory.map((item) => (
                    <div className="question-row" key={item.upload_id}>
                      <div>
                        <strong>{item.original_file_name}</strong>
                        <small>{item.object_key} · {item.status} · {item.question_count ?? "—"} questions</small>
                        <small>Uploaded by {item.uploaded_by} · {item.completed_at ? new Date(item.completed_at).toLocaleString() : new Date(item.started_at).toLocaleString()}</small>
                        <small>{item.duplicate_count || 0} exact duplicate prompt(s){item.validation_issues_json && JSON.parse(item.validation_issues_json).length ? " · " + JSON.parse(item.validation_issues_json).join(" ") : ""}</small>
                      </div>
                      <small>+{item.added_count} · ~{item.updated_count} · −{item.removed_count}</small>
                    </div>
                  )) : "No R2 uploads recorded yet."}
                </div>
              </article>
              <article className="panel">
                <div className="panel-heading"><div><h2>Question change history</h2><p className="muted">Added, updated and removed question IDs from bank uploads.</p></div></div>
                <div className={questionHistory.length ? "question-list" : "empty-state"}>
                  {questionHistory.length ? questionHistory.map((item) => (
                    <div className="question-row" key={item.id}>
                      <div>
                        <strong>{item.question_code || item.question_id} · {item.action}</strong>
                        <small>{item.object_key} · {item.changed_by} · {new Date(item.changed_at).toLocaleString()}</small>
                        <details><summary>View change</summary>
                          <small>Previous: {item.before_json || "—"}<br />New: {item.after_json || "—"}</small>
                        </details>
                      </div>
                    </div>
                  )) : "No question changes recorded yet."}
                </div>
              </article>
              <div className="notice-card">
                <b>Question editor status</b>
                <p>The question builder and its draft/publish workflow are still a local demo. Uploading a JSON or ZIP file here stores it in R2; it does not automatically import or publish its questions.</p>
              </div>
            </section>
            <section className={view === "review" ? "view active" : "view"} id="view-review">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">QUALITY CONTROL</div>
                  <h1>Review & publish</h1>
                  <p className="muted">Only approved questions can be sent to the publishing API.</p>
                </div>
              </div>
              <div className="notice-card">
                <b>Demo workspace — Cloudflare is not connected</b>
                <p>
                  You can create, save, validate, preview and demo-publish questions in this browser.
                  Demo-published questions are not visible to students and are not uploaded to the live
                  website. Cloudflare integration will be added later.
                </p>
              </div>
              <div id="review-list" className="question-list">
                {drafts.length ? (
                  <>
                    {drafts.map((item) => {
                      const errors = validateQuestion(item);
                      return (
                        <QuestionRow
                          key={item.id}
                          question={item}
                          review
                          detail={
                            errors.length ? `${errors.length} validation issue(s)` : "Basic checks passed"
                          }
                        >
                          <div className="review-actions">
                            <span className="draft-pill">{errors.length ? "Needs review" : "Ready"}</span>
                            <button className="text-button" onClick={() => edit(item)}>
                              Preview
                            </button>
                            <button
                              className="text-button"
                              disabled={Boolean(errors.length)}
                              onClick={() => publish([item.id])}
                            >
                              Publish demo
                            </button>
                          </div>
                        </QuestionRow>
                      );
                    })}
                    <div className="review-footer">
                      <button className="primary" onClick={() => publish(ready.map((item) => item.id))}>
                        Publish all ready (demo)
                      </button>
                      <small>
                        Demo publishing only changes local browser data. Nothing is sent to the live website.
                      </small>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">No drafts waiting for review. Add questions first.</div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
      <div id="toast" className={toast ? "toast show" : "toast"} role="status">
        {toast}
      </div>
    </>
  );
}

mount(Dashboard);
