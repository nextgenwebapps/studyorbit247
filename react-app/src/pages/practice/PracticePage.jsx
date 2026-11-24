import { useState } from "react";
import { mount } from "../../mount.jsx";
import { subjects } from "../home/Subjects.jsx";
import { exams } from "../home/Exams.jsx";
import { Question } from "../mocktest/Question.jsx";
import { displayAnswer, emptyAnswer, hasAnswer, scoreQuestion } from "../mocktest/answers.js";
import { findQuestions } from "./catalog.js";
import "../mocktest/mocktest.css";
import "./practice.css";

const subjectOptions = subjects.map(([, title]) => title);
const examOptions = exams.map(([, , title]) => title);

function Filter({ label, name, options, value, onChange, disabled = false, all = label === "Level" ? "Any level" : "All " + label.toLowerCase() + "s" }) {
  return (
    <label className="practice-field">
      {label}
      <select name={name} value={value} onChange={onChange} disabled={disabled}>
        <option value="">{all}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

const PALETTE_PAGE_SIZE = 20;
const BOOKMARKS_KEY = "studyorbit_practice_bookmarks_v1";

function readBookmarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}
const statusLabels = {
  unvisited: "Unvisited",
  opened: "Opened",
  correct: "Correct",
  incorrect: "Incorrect",
};

function QuestionPalette({ questions, current, attempts, visited, onSelect }) {
  const [page, setPage] = useState(() => Math.floor(current / PALETTE_PAGE_SIZE));
  const pageCount = Math.ceil(questions.length / PALETTE_PAGE_SIZE);
  const start = page * PALETTE_PAGE_SIZE;

  return (
    <nav id="practice-palette" className="question-panel practice-palette" aria-label="Question Palette">
      <h3>Jump to a question</h3>
      <div className="practice-number-grid">
        {questions.slice(start, start + PALETTE_PAGE_SIZE).map((question, offset) => {
          const index = start + offset;
          const attempt = attempts[question.id];
          const status = attempt?.status ?? (visited.has(index) ? "opened" : "unvisited");
          return (
            <button
              key={question.id}
              type="button"
              data-status={status}
              data-review={Boolean(attempt?.review)}
              aria-current={current === index ? "step" : undefined}
              aria-label={`Question ${index + 1}, ${statusLabels[status]}${attempt?.review ? ", marked for review" : ""}`}
              onClick={() => onSelect(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      {pageCount > 1 && (
        <div className="practice-palette-pages">
          <button type="button" className="secondary-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <small>{page + 1} / {pageCount}</small>
          <button type="button" className="secondary-btn" disabled={page + 1 === pageCount} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      <ul className="practice-legend">
        {Object.entries(statusLabels).map(([status, label]) => <li key={status} data-status={status}>{label}</li>)}
        <li data-status="review">Review</li>
      </ul>
    </nav>
  );
}

const REPORTS_KEY = "studyorbit_practice_reports_v1";
const reportReasons = ["Incorrect answer", "Error in question or options", "Missing or broken image", "Other"];

function QuestionReport({ questionId, onClose }) {
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const reason = fields.get("reason");
    if (!reportReasons.includes(reason)) return;

    try {
      const previous = JSON.parse(localStorage.getItem(REPORTS_KEY) || "{}");
      const reports = previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {};
      localStorage.setItem(REPORTS_KEY, JSON.stringify({
        ...reports,
        [questionId]: {
          questionId,
          reason,
          details: String(fields.get("details") || "").trim(),
          createdAt: new Date().toISOString(),
        },
      }));
      setSaved(true);
      setMessage("Report saved on this device.");
    } catch {
      setMessage("Could not save the report on this device.");
    }
  }

  return (
    <form className="practice-report-form" id="practice-report-form" onSubmit={submit}>
      <strong>Report this question</strong>
      <p>Reports are saved on this device.</p>
      {!saved && (
        <>
          <label className="practice-field">
            Reason
            <select name="reason" defaultValue="" required>
              <option value="" disabled>Choose a reason</option>
              {reportReasons.map((reason) => <option key={reason}>{reason}</option>)}
            </select>
          </label>
          <label className="practice-field">
            Details (optional)
            <textarea name="details" rows={3} maxLength={500} />
          </label>
        </>
      )}
      <div className="practice-question-actions">
        {!saved && <button type="submit" className="primary-btn">Save Report</button>}
        <button type="button" className="secondary-btn" onClick={onClose}>{saved ? "Done" : "Cancel"}</button>
      </div>
      <div role="status">{message}</div>
    </form>
  );
}

function PracticeSession({ questions, bookmarks, onBookmark }) {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [visited, setVisited] = useState(() => new Set([0]));
  const [attempts, setAttempts] = useState({});
  const question = questions[current];
  const bookmarked = bookmarks.includes(question.id);
  const attempt = attempts[question.id];
  const answer = attempt?.answer ?? emptyAnswer(question);
  const checked = Object.values(attempts).filter((item) => item.status).length;

  function updateAttempt(changes) {
    setAttempts((items) => ({
      ...items,
      [question.id]: { ...items[question.id], ...changes },
    }));
  }

  function changeQuestion(index) {
    if (index !== current) setReportOpen(false);
    setCurrent(index);
    setVisited((items) => new Set([...items, index]));
  }

  return (
    <>
      <div className="practice-session-bar">
        <div>
          <strong>Question {current + 1} of {questions.length}</strong>
          <span>{checked} checked</span>
          <progress value={checked} max={questions.length} aria-label="Questions checked" />
        </div>
        <button type="button" className="secondary-btn practice-toggle" aria-expanded={open} aria-controls="practice-palette" onClick={() => setOpen(!open)}>
          {open ? "Hide Question Palette" : "Question Palette"}
        </button>
      </div>
      <div className={open ? "practice-workspace palette-visible" : "practice-workspace"}>
        <article className="question-panel practice-question">
          <div className="practice-session-bar-heading">
            <p className="practice-question-meta">{question.chapter} · {question.topic} · {question.level}</p>
            <div className="practice-question-tools">
              <button type="button" className="secondary-btn practice-review" aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"} aria-pressed={bookmarked} onClick={() => onBookmark(question.id)}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                  <path d="M6 4h12v16l-6-4-6 4z" />
                </svg>
                <span>{bookmarked ? "Bookmarked" : "Bookmark"}</span>
              </button>
              <button type="button" className="secondary-btn" aria-label="Report question" aria-expanded={reportOpen} aria-controls={reportOpen ? "practice-report-form" : undefined} onClick={() => setReportOpen(!reportOpen)}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 21V4m0 1h14l-3 4 3 4H5" />
                </svg>
                <span>Report</span>
              </button>
            </div>
          </div>
          {reportOpen && <QuestionReport key={question.id} questionId={question.id} onClose={() => setReportOpen(false)} />}
          <Question key={question.id} question={question} answer={answer} onAnswer={(value) => updateAttempt({ answer: value, status: null })} />
          <div className="practice-question-actions">
            <button type="button" className="secondary-btn" disabled={current === 0} onClick={() => changeQuestion(current - 1)}>Previous</button>
            <button type="button" className="secondary-btn" disabled={!hasAnswer(answer)} onClick={() => updateAttempt({ answer: emptyAnswer(question), status: null })}>Clear Answer</button>
            <button type="button" className="secondary-btn practice-review" aria-pressed={Boolean(attempt?.review)} onClick={() => updateAttempt({ review: !attempt?.review })}>
              {attempt?.review ? "Marked for Review" : "Review Later"}
            </button>
            <button type="button" className="primary-btn" disabled={!hasAnswer(answer) || Boolean(attempt?.status)} onClick={() => updateAttempt({ status: scoreQuestion(question, answer) ? "correct" : "incorrect" })}>Check Answer</button>
            <button type="button" className="secondary-btn" disabled={current + 1 === questions.length} onClick={() => changeQuestion(current + 1)}>Next</button>
          </div>
          <div role="status">
            {attempt?.status && <p className="practice-feedback" data-status={attempt.status}>
              <strong>{statusLabels[attempt.status]}.</strong> Correct answer: {displayAnswer(question.correct)}.
              {question.explanation && <> {question.explanation}</>}
            </p>}
          </div>
        </article>
        {open && <QuestionPalette
          key={Math.floor(current / PALETTE_PAGE_SIZE)}
          questions={questions}
          current={current}
          attempts={attempts}
          visited={visited}
          onSelect={changeQuestion}
        />}
      </div>
    </>
  );
}

function PracticePage() {
  const [filters, setFilters] = useState(() => {
    const subject = new URLSearchParams(window.location.search).get("subject");
    return { subject: subjectOptions.includes(subject) ? subject : "", exam: "", chapter: "", topic: "", level: "" };
  });
  const [results, setResults] = useState(null);
  const [bookmarks, setBookmarks] = useState(readBookmarks);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [bookmarkMessage, setBookmarkMessage] = useState("");

  function toggleBookmark(id) {
    const removing = bookmarks.includes(id);
    const next = removing ? bookmarks.filter((item) => item !== id) : [...bookmarks, id];
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      setBookmarks(next);
      setBookmarkMessage(removing ? "Bookmark removed." : "Question bookmarked.");
    } catch {
      setBookmarkMessage("Bookmarks could not be saved in this browser.");
    }
  }
  const [searchNumber, setSearchNumber] = useState(0);
  const { subject, exam, chapter, topic, level } = filters;
  const chapters = [...new Set(findQuestions({ subject, exam }).map((question) => question.chapter))].sort();
  const topics = [...new Set(findQuestions({ subject, exam, chapter }).map((question) => question.topic))].sort();

  function changeFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "subject" || name === "exam") next.chapter = "";
      if (name === "subject" || name === "exam" || name === "chapter") next.topic = "";
      return next;
    });
    setResults(null);
  }

  function search(event) {
    event.preventDefault();
    const matches = findQuestions(filters);
    setResults(bookmarkedOnly ? matches.filter(({ id }) => bookmarks.includes(id)) : matches);
    setSearchNumber((value) => value + 1);
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="../"><span>Study<em>Orbit</em>247</span></a>
      </header>
      <main className="practice-page">
        <h1>Practice Now</h1>
        <p>Filter the demo question bank to find questions for your next practice session.</p>
        <form className="question-panel practice-form" onSubmit={search}>
          <div className="practice-filters">
            <Filter label="Subject" name="subject" options={subjectOptions} value={subject} onChange={changeFilter} />
            <Filter label="Exam" name="exam" options={examOptions} value={exam} onChange={changeFilter} />
            <Filter label="Chapter" name="chapter" options={chapters} value={chapter} onChange={changeFilter} disabled={!chapters.length} />
            <Filter label="Topic" name="topic" options={topics} value={topic} onChange={changeFilter} disabled={!topics.length} />
            <Filter label="Level" name="level" options={["Easy", "Medium", "Hard"]} value={level} onChange={changeFilter} />
            <button type="submit" className="primary-btn">Search</button>
          </div>
          <label className="practice-bookmark-filter">
            <input type="checkbox" checked={bookmarkedOnly} onChange={(event) => setBookmarkedOnly(event.target.checked)} />
            Bookmarked only ({bookmarks.length})
          </label>
        </form>
        <p role="status" className="practice-bookmark-feedback" hidden={!bookmarkMessage}>{bookmarkMessage}</p>
        <section className="practice-results" aria-labelledby="practice-total">
          <h2 id="practice-total" aria-live="polite">Total Questions: {results === null ? "—" : results.length}</h2>
          {results?.length === 0 && <p>No questions match these filters. Try a different subject or exam, or clear a filter.</p>}
          {results?.length > 0 && <PracticeSession key={searchNumber} questions={results} bookmarks={bookmarks} onBookmark={toggleBookmark} />}
        </section>
      </main>
    </>
  );
}

mount(PracticePage);
