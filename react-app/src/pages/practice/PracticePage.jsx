import { useEffect, useRef, useState } from "react";
import PracticeHeader from "./PracticeHeader.jsx";
import { mount } from "../../mount.jsx";
import { subjects } from "../home/Subjects.jsx";
import { exams } from "../home/Exams.jsx";
import { Question } from "../mocktest/Question.jsx";
import { displayAnswer, emptyAnswer, hasAnswer, scoreQuestion } from "../mocktest/answers.js";
import { findQuestions, matchesPracticeFilters } from "./catalog.js";
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
const attemptStatuses = ["Bookmarked", "Unattempted", "Attempted", "Correct", "Incorrect"];
const sourceOptions = ["Practice Questions Only", "PYQs Only"];
const ATTEMPTS_KEY = "studyorbit_practice_attempts_v1";

function readAttempts() {
  try {
    const saved = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

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

function QuestionPalette({ questions, current, attempts, bookmarks, visited, onSelect }) {
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
          const bookmarked = bookmarks.includes(question.id);
          const status = attempt?.status ?? (visited.has(index) ? "opened" : "unvisited");
          return (
            <button
              key={question.id}
              type="button"
              data-status={status}
              data-review={Boolean(attempt?.review)}
              aria-current={current === index ? "step" : undefined}
              aria-label={`Question ${index + 1}, ${statusLabels[status]}${attempt?.review ? ", marked for review" : ""}${bookmarked ? ", bookmarked" : ""}`}
              onClick={() => onSelect(index)}
            >
              {index + 1}
              {bookmarked && <svg className="practice-palette-bookmark" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h12v16l-6-4-6 4z" /></svg>}
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
        <li data-status="bookmarked">Bookmarked</li>
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
        <button type="button" className="secondary-btn" onClick={(event) => {
          event.preventDefault();
          onClose();
        }}>{saved ? "Done" : "Cancel"}</button>
      </div>
      <div role="status">{message}</div>
    </form>
  );
}

function PracticeSession({ questions, attempts, setAttempts, bookmarks, onBookmark }) {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const [reportQuestionId, setReportQuestionId] = useState(null);
  const reportButtonRef = useRef(null);
  const [visited, setVisited] = useState(() => new Set([0]));
  const question = questions[current];
  const reportOpen = reportQuestionId === question.id;
  const bookmarked = bookmarks.includes(question.id);
  const attempt = attempts[question.id];
  const answer = attempt?.answer ?? emptyAnswer(question);
  const checked = questions.filter(({ id }) => attempts[id]?.status).length;

  function updateAttempt(changes) {
    setAttempts((items) => ({
      ...items,
      [question.id]: { ...items[question.id], ...changes },
    }));
  }

  function closeReport() {
    setReportQuestionId(null);
    reportButtonRef.current?.focus({ preventScroll: true });
  }

  function changeQuestion(index) {
    if (index !== current) setReportQuestionId(null);
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
              <button type="button" className="secondary-btn" ref={reportButtonRef} aria-label={reportOpen ? "Close report form" : "Report question"} aria-expanded={reportOpen} aria-controls={reportOpen ? "practice-report-form" : undefined} onClick={() => setReportQuestionId((id) => id === question.id ? null : question.id)}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 21V4m0 1h14l-3 4 3 4H5" />
                </svg>
                <span>{reportOpen ? "Close Report" : "Report"}</span>
              </button>
            </div>
          </div>
          {reportOpen && <QuestionReport questionId={question.id} onClose={closeReport} />}
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
          bookmarks={bookmarks}
          visited={visited}
          onSelect={changeQuestion}
        />}
      </div>
    </>
  );
}

function PracticePage() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [filters, setFilters] = useState(() => {
    const subject = new URLSearchParams(window.location.search).get("subject");
    return { subject: subjectOptions.includes(subject) ? subject : "", exam: "", chapter: "", topic: "", level: "", status: "", source: "" };
  });
  const [results, setResults] = useState(null);
  const [bookmarks, setBookmarks] = useState(readBookmarks);
  const [attempts, setAttempts] = useState(readAttempts);
  useEffect(() => {
    try {
      localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch {
      // Search can still use this session's attempts if storage is unavailable.
    }
  }, [attempts]);
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
  const resultsRef = useRef(null);

  useEffect(() => {
    if (results?.length) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultsRef.current?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
    }
  }, [results]);
  const { subject, exam, chapter, topic, level, status, source } = filters;
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
    setResults(matches.filter((question) => matchesPracticeFilters(question, filters, bookmarks, attempts)));
    setSearchNumber((value) => value + 1);
  }

  return (
    <>
      <PracticeHeader onInstructions={() => setShowInstructions((value) => !value)} />
      <main className="practice-page">
        <h1 className="practice-title">Practice <span className="practice-title-now" data-paused={searchNumber > 0}>Now</span></h1>
        {showInstructions && <p role="status">Choose filters and select Search. Check your answers as you go, or use Question Palette to jump to another question.</p>}
        <form className="practice-form" onSubmit={search} aria-label="Question search">
          <div className="practice-filters">
            <Filter label="Subject" name="subject" options={subjectOptions} value={subject} onChange={changeFilter} />
            <Filter label="Exam" name="exam" options={examOptions} value={exam} onChange={changeFilter} />
            <Filter label="Chapter" name="chapter" options={chapters} value={chapter} onChange={changeFilter} disabled={!chapters.length} />
            <Filter label="Topic" name="topic" options={topics} value={topic} onChange={changeFilter} disabled={!topics.length} />
            <Filter label="Level" name="level" options={["Easy", "Medium", "Hard"]} value={level} onChange={changeFilter} />
            <Filter label="Status" name="status" all="All Status" options={attemptStatuses} value={status} onChange={changeFilter} />
            <Filter label="Sources" name="source" all="All Sources" options={sourceOptions} value={source} onChange={changeFilter} />
            <button type="submit" className="primary-btn practice-search">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              Search
            </button>
          </div>
        </form>
        <p role="status" className="practice-bookmark-feedback" hidden={!bookmarkMessage}>{bookmarkMessage}</p>
        {results !== null && (
          <section ref={resultsRef} className="practice-results" aria-labelledby="practice-total">
            <h2 id="practice-total" aria-live="polite">Total Questions: {results.length}</h2>
            {results.length === 0 && <p>No questions match these filters. Try changing or clearing a filter.</p>}
            {results.length > 0 && <PracticeSession key={searchNumber} questions={results} attempts={attempts} setAttempts={setAttempts} bookmarks={bookmarks} onBookmark={toggleBookmark} />}
          </section>
        )}
      </main>
    </>
  );
}

mount(PracticePage);
