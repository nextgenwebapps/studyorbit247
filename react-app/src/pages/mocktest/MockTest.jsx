import { useEffect, useRef, useState } from "react";
import { mount } from "../../mount.jsx";
import { Question } from "./Question.jsx";
import { emptyAnswer, hasAnswer, displayAnswer, scoreQuestion } from "./answers.js";
import questionBank from "./questions.json";

const CONTENT_API = (window.STUDYORBIT_CONTENT_API || "https://studyorbit247-api.studyorbit247.workers.dev/api/content").replace(/\/$/, "");
const instructions =
  "Use the question palette to move between questions. Save & next records your answer. Use Mark for review to revisit a question. Multi-select questions may have more than one correct option. Submit to view your result and answer review.";

function formatTime(seconds) {
  return [Math.floor(seconds / 60), seconds % 60].map((value) => String(value).padStart(2, "0")).join(":");
}




const typeLabels = {
  mcq: "SINGLE CORRECT",
  multi: "MULTIPLE SELECT",
  truefalse: "TRUE / FALSE",
  image: "IMAGE BASED MCQ",
  fill: "FILL IN THE BLANK",
  numeric: "NUMERICAL ANSWER",
  match: "MATCH THE FOLLOWING",
  ordering: "SEQUENCE / ORDERING",
  assertion: "ASSERTION & REASON",
  passage: "PASSAGE BASED",
  matrix: "MULTIPLE STATEMENTS",
  greText: "TEXT COMPLETION",
  greEquiv: "SENTENCE EQUIVALENCE",
  greQuant: "QUANTITATIVE COMPARISON",
  gateNat: "GATE NUMERICAL ANSWER",
  gateMsq: "GATE MULTI-SELECT",
  di: "DATA INTERPRETATION",
  hotspot: "IMAGE / HOTSPOT",
};
function saveLearningActivity(entry) {
  try {
    const key = "studyorbit_learning_activity_v1";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const safe = Array.isArray(existing) ? existing : [];
    safe.unshift({
      ...entry,
      id: "act_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      completedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(safe.slice(0, 100)));
  } catch (e) {
    console.warn("Could not save learning activity", e);
  }
}
function MockTest() {
  const [bank, setBank] = useState(questionBank);
  const { questions, durationSeconds: duration } = bank;
  const [screen, setScreen] = useState("intro");
  const [answers, setAnswers] = useState({});
  const [reviewed, setReviewed] = useState([]);
  const [visited, setVisited] = useState([0]);
  const [current, setCurrent] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [modal, setModal] = useState(null);
  const [result, setResult] = useState(null);
  const deadline = useRef(0);
  const finished = useRef(false);
  const palette = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${CONTENT_API}/question-bank/gk/latest.json`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("R2 question bank is not available yet.");
        return response.json();
      })
      .then((nextBank) => {
        if (Array.isArray(nextBank?.questions) && nextBank.questions.length > 0) setBank(nextBank);
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.info("Using the bundled question bank until R2 content is available.");
      });
    return () => controller.abort();
  }, []);

  const question = questions[current];
  const answer = answers[question.id] ?? emptyAnswer(question);
  const answered = questions.filter((q) => hasAnswer(answers[q.id])).length;
  const progress = Math.round((answered / questions.length) * 100);
  const visitedUnanswered = visited.filter((index) => !hasAnswer(answers[questions[index].id])).length;

  useEffect(() => {
    if (screen !== "test") return;
    const timer = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (paletteOpen) palette.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [paletteOpen]);

  function start() {
    deadline.current = Date.now() + duration * 1000;
    finished.current = false;
    setAnswers({});
    setCurrent(0);
    setReviewed([]);
    setVisited([0]);
    setPaletteOpen(false);
    setTimeLeft(duration);
    setModal(null);
    setScreen("test");
  }

  function go(index) {
    setCurrent(index);
    setVisited((items) => (items.includes(index) ? items : [...items, index]));
    setPaletteOpen(false);
  }

  function updateAnswer(value) {
    setAnswers((items) => ({ ...items, [question.id]: value }));
  }

  function toggleReview() {
    setReviewed((items) =>
      items.includes(current) ? items.filter((index) => index !== current) : [...items, current],
    );
  }

  function status(index) {
    const has = hasAnswer(answers[questions[index].id]);
    if (reviewed.includes(index)) return has ? "answered-review" : "review";
    if (!visited.includes(index)) return "not-visited";
    return has ? "answered" : "not-answered";
  }

  function finish(auto) {
    if (finished.current || screen !== "test") return;
    finished.current = true;
    const correct = questions.filter(
      (q) => hasAnswer(answers[q.id]) && scoreQuestion(q, answers[q.id]),
    ).length;
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    const total = questions.length;
    setResult({ correct, accuracy, auto, elapsed: duration - timeLeft, attempted: answered, total });
    saveLearningActivity({
      type: "exam",
      title: "General Knowledge Mock Test",
      detail: `GK · ${total}-question demo mock test`,
      score: correct,
      total,
      accuracy,
      attempted: answered,
      url: "../mocktest/",
    });
    setModal(null);
    setScreen("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (screen === "test" && timeLeft === 0) finish(true);
  });

  function showSubmit() {
    setModal("submit");
  }

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="../index.html">
            <span>
              Study<em>Orbit</em>247
            </span>
          </a>
          <div className="test-meta">
            <span className="live-dot"></span>
            <span>GENERAL KNOWLEDGE</span>
            <span className="meta-divider">/</span>
            <span>FULL MOCK TEST</span>
          </div>
          <button
            className="icon-btn"
            id="instructionsBtn"
            onClick={() => setModal("instructions")}
            title="Instructions"
            aria-label="Instructions"
          >
            ⓘ
          </button>
        </header>
        <main id="app">
          <section className={screen === "intro" ? "intro-screen" : "intro-screen hidden"} id="introScreen">
            <div className="intro-copy">
              <div className="eyebrow">STUDYORBIT247 · MOCK TEST LAB</div>
              <h1>
                Test your knowledge.
                <br />
                <span>Own your progress.</span>
              </h1>
              <p>
                A realistic, timed GK mock test with multiple question formats, question palette, review tools
                and a detailed result report.
              </p>
              <div className="intro-points">
                <span>✓ Exam-style interface</span>
                <span>✓ Multiple answer formats</span>
                <span>✓ Detailed performance report</span>
              </div>
            </div>
            <div className="setup-card">
              <div className="setup-top">
                <div className="setup-icon">✦</div>
                <div>
                  <b>General Knowledge</b>
                  <small>Practice test · {questions.length} questions</small>
                </div>
                <span className="gold-tag">DEMO</span>
              </div>
              <div className="setup-stats">
                <div>
                  <b>{Math.floor(duration / 60)} min</b>
                  <small>Duration</small>
                </div>
                <div>
                  <b>{questions.length}</b>
                  <small>Questions</small>
                </div>
                <div>
                  <b>{bank.totalMarks ?? questions.length} marks</b>
                  <small>Total marks</small>
                </div>
              </div>
              <div className="setup-rule"></div>
              <div className="setup-row">
                <span>Question formats</span>
                <b>MCQ · Multi-select · T/F · Image · Match · More</b>
              </div>
              <div className="setup-row">
                <span>Navigation</span>
                <b>Free navigation + mark for review</b>
              </div>
              <button className="primary-btn full" id="startBtn" onClick={start}>
                Start mock test <span>→</span>
              </button>
              <p className="tiny-note">Your demo answers stay in this browser session.</p>
            </div>
          </section>

          <section className={screen === "test" ? "test-screen" : "test-screen hidden"} id="testScreen">
            <div className="test-heading">
              <div>
                <div className="eyebrow">GENERAL KNOWLEDGE · PRACTICE SET 01</div>
                <h1>
                  Mock test <span>attempt</span>
                </h1>
              </div>
              <div className="test-heading-actions">
                <button
                  className="palette-toggle-btn"
                  id="paletteToggleBtn"
                  onClick={() => setPaletteOpen(!paletteOpen)}
                  type="button"
                  aria-expanded={paletteOpen}
                  aria-controls="palettePanel"
                  title="Show or hide question navigation"
                >
                  ▦ <span className="palette-btn-label">Question palette</span>
                  <span className="palette-btn-state">{paletteOpen ? "Hide" : "Show"}</span>
                </button>
                <div className={timeLeft <= 120 ? "timer-card warning" : "timer-card"}>
                  <small>TIME LEFT</small>
                  <strong id="timer">{formatTime(timeLeft)}</strong>
                  <span className="timer-state">● Test in progress</span>
                </div>
              </div>
            </div>
            <div className="progress-wrap">
              <div className="progress-info">
                <span id="progressText">{`Question ${current + 1} of ${questions.length}`}</span>
                <b id="progressPercent">{`${progress}% answered`}</b>
              </div>
              <div className="progress-track">
                <i id="progressBar" style={{ width: `${progress}%` }}></i>
              </div>
            </div>
            <div className={paletteOpen ? "test-layout palette-open" : "test-layout"}>
              <section className="question-panel">
                <div className="question-toolbar">
                  <div>
                    <span
                      className="question-count"
                      id="questionCount"
                    >{`QUESTION ${String(current + 1).padStart(2, "0")}`}</span>
                    <span className="type-chip" id="typeChip">
                      {typeLabels[question.type] ?? question.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="marks">
                    <span>+1.00</span>
                    <span>−0.00</span>
                  </div>
                </div>
                <div className="question-body" id="questionBody">
                  <Question key={question.id} question={question} answer={answer} onAnswer={updateAnswer} />
                </div>
                <div className="question-actions">
                  <button
                    className="text-btn"
                    id="clearBtn"
                    onClick={() => updateAnswer(emptyAnswer(question))}
                  >
                    ↺ Clear response
                  </button>
                  <button
                    className={reviewed.includes(current) ? "review-btn active" : "review-btn"}
                    id="reviewBtn"
                    onClick={toggleReview}
                  >
                    {reviewed.includes(current) ? "⚑ Remove review mark" : "⚑ Mark for review"}
                  </button>
                </div>
                <div className="bottom-actions">
                  <button
                    className="secondary-btn"
                    disabled={current === 0}
                    style={{ opacity: current === 0 ? 0.4 : 1 }}
                    id="prevBtn"
                    onClick={() => go(current - 1)}
                  >
                    ← Previous
                  </button>
                  <div>
                    <button
                      className="secondary-btn"
                      id="nextBtn"
                      onClick={() => (current === questions.length - 1 ? showSubmit() : go(current + 1))}
                    >
                      {current === questions.length - 1 ? "Save response" : "Save & next →"}
                    </button>
                    <button className="primary-btn submit-inline" id="submitBtn" onClick={showSubmit}>
                      Submit test
                    </button>
                  </div>
                </div>
              </section>
              <aside
                className={paletteOpen ? "palette-panel" : "palette-panel hidden"}
                ref={palette}
                id="palettePanel"
              >
                <div className="palette-card-head">
                  <div className="palette-head-icon">▦</div>
                  <div>
                    <b>Navigate questions</b>
                    <small>Jump to any question · Your answers save automatically</small>
                  </div>
                  <span
                    className="palette-total"
                    id="paletteProgress"
                  >{`${answered} / ${questions.length} answered`}</span>
                </div>
                <div className="palette-title">
                  <b>Question palette</b>
                  <small>Tap a number to jump</small>
                </div>
                <div className="legend">
                  <span>
                    <i className="lg answered"></i>Answered
                  </span>
                  <span>
                    <i className="lg not-answered"></i>Not answered
                  </span>
                  <span>
                    <i className="lg review"></i>Review
                  </span>
                  <span>
                    <i className="lg answered-review"></i>Answered + review
                  </span>
                  <span>
                    <i className="lg not-visited"></i>Not visited
                  </span>
                </div>
                <div className="palette-grid" id="palette">
                  {questions.map((q, index) => (
                    <button
                      key={q.id}
                      className={`qbtn ${status(index)}${index === current ? " current" : ""}`}
                      onClick={() => go(index)}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="palette-footer">
                  <div>
                    <span>Answered</span>
                    <b id="answeredCount">{answered}</b>
                  </div>
                  <div>
                    <span>Not answered</span>
                    <b id="unansweredCount">{visitedUnanswered}</b>
                  </div>
                  <div>
                    <span>For review</span>
                    <b id="reviewCount">{reviewed.length}</b>
                  </div>
                </div>
                <button className="finish-btn" id="finishBtn" onClick={showSubmit}>
                  Finish & submit test <span>→</span>
                </button>
              </aside>
            </div>
          </section>

          {result && (
            <section
              className={screen === "result" ? "result-screen" : "result-screen hidden"}
              id="resultScreen"
            >
              <div className="result-header">
                <div className="eyebrow">TEST COMPLETED · PERFORMANCE REPORT</div>
                <h1>
                  Your result is <span>ready.</span>
                </h1>
                <p>
                  Review your score, accuracy and every response. Use the insights to plan your next practice
                  session.
                </p>
              </div>
              <div className="result-hero">
                <div
                  className="score-ring"
                  id="scoreRing"
                  style={{
                    background: `conic-gradient(#e5c674 ${(result.correct / result.total) * 360}deg, #51483a 0deg)`,
                  }}
                >
                  <div>
                    <strong id="scoreValue">{result.correct}</strong>
                    <small> / {result.total}</small>
                    <span>YOUR SCORE</span>
                  </div>
                </div>
                <div className="result-summary">
                  <span className="gold-tag">MOCK TEST REPORT</span>
                  <h2 id="resultMessage">
                    {result.accuracy >= 80
                      ? "Excellent work!"
                      : result.accuracy >= 55
                        ? "Good effort. Keep improving."
                        : "A fresh start to stronger preparation."}
                  </h2>
                  <p id="resultSub">{`${result.auto ? "Time ended." : "You completed the mock test."} You attempted ${result.attempted} out of ${result.total} questions.`}</p>
                  <div className="summary-stats">
                    <div>
                      <b id="accuracyValue">{`${result.accuracy}%`}</b>
                      <small>Accuracy</small>
                    </div>
                    <div>
                      <b id="attemptedValue">{`${result.attempted}/${result.total}`}</b>
                      <small>Attempted</small>
                    </div>
                    <div>
                      <b id="timeValue">{formatTime(result.elapsed)}</b>
                      <small>Time taken</small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="result-grid">
                <div className="result-card">
                  <span className="result-icon green">✓</span>
                  <small>Correct answers</small>
                  <b id="correctValue">{result.correct}</b>
                </div>
                <div className="result-card">
                  <span className="result-icon red">✕</span>
                  <small>Incorrect answers</small>
                  <b id="wrongValue">{result.attempted - result.correct}</b>
                </div>
                <div className="result-card">
                  <span className="result-icon grey">—</span>
                  <small>Unattempted</small>
                  <b id="skippedValue">{result.total - result.attempted}</b>
                </div>
                <div className="result-card">
                  <span className="result-icon gold">⚑</span>
                  <small>Marked for review</small>
                  <b id="markedValue">{reviewed.length}</b>
                </div>
              </div>
              <div className="report-card insights-horizontal">
                <div className="card-heading">
                  <div>
                    <h3>Performance insights</h3>
                    <p>A quick breakdown of this attempt</p>
                  </div>
                  <span className="gold-tag">OVERVIEW</span>
                </div>
                <div className="insight-metrics">
                  <div className="insight-metric">
                    <div className="insight-row">
                      <span>Accuracy</span>
                      <b id="insightAccuracy">{`${result.accuracy}%`}</b>
                    </div>
                    <div className="insight-track">
                      <i id="accuracyBar" style={{ width: `${result.accuracy}%` }}></i>
                    </div>
                  </div>
                  <div className="insight-metric">
                    <div className="insight-row">
                      <span>Attempt rate</span>
                      <b id="insightAttempt">{`${Math.round((result.attempted / result.total) * 100)}%`}</b>
                    </div>
                    <div className="insight-track">
                      <i id="attemptBar" style={{ width: `${(result.attempted / result.total) * 100}%` }}></i>
                    </div>
                  </div>
                  <div className="insight-metric">
                    <div className="insight-row">
                      <span>Correctness among attempted</span>
                      <b id="insightCorrect">{`${result.accuracy}%`}</b>
                    </div>
                    <div className="insight-track">
                      <i id="correctBar" style={{ width: `${result.accuracy}%` }}></i>
                    </div>
                  </div>
                </div>
                <div className="next-tip">
                  <b>✦ Next step</b>
                  <p>
                    Review incorrect and skipped questions, then retake the test to measure your improvement.
                  </p>
                </div>
              </div>
              <div className="result-columns">
                <div className="report-card">
                  <div className="card-heading">
                    <div>
                      <h3>Question-wise analysis</h3>
                      <p>Correct answer and your response</p>
                    </div>
                    <span className="gold-tag">REVIEW</span>
                  </div>
                  <div id="reviewList" className="review-list">
                    {questions.map((q, index) => {
                      const response = answers[q.id];
                      const has = hasAnswer(response);
                      const correct = has && scoreQuestion(q, response);
                      return (
                        <div className="review-item" key={q.id}>
                          <div className="review-item-top">
                            <span>
                              Q{index + 1} · {typeLabels[q.type] ?? q.type}
                            </span>
                            <span
                              className={`status-pill ${correct ? "correct" : has ? "wrong" : "skipped"}`}
                            >
                              {correct ? "Correct" : has ? "Incorrect" : "Skipped"}
                            </span>
                          </div>
                          <p>{q.prompt}</p>
                          <div className="review-answer">
                            Your answer: <b>{displayAnswer(response)}</b>
                            <br />
                            Correct answer: <b>{displayAnswer(q.correct)}</b>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="result-actions">
                <button className="secondary-btn" id="retakeBtn" onClick={start}>
                  ↻ Retake mock test
                </button>
                <a className="primary-btn link-btn" href="../index.html">
                  Back to StudyOrbit247 ↗
                </a>
              </div>
            </section>
          )}
        </main>
        <footer className="app-footer">
          <span>© 2026 StudyOrbit247</span>
          <span>LEARN · PRACTICE · PROGRESS</span>
        </footer>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalTitle"
          id="modal"
        >
          <div className="modal-card">
            <button className="modal-close" id="modalClose" onClick={() => setModal(null)}>
              ×
            </button>
            <div className="modal-symbol">✦</div>
            <h2 id="modalTitle">{modal === "instructions" ? "Test instructions" : "Submit your test?"}</h2>
            <p id="modalText">
              {modal === "instructions"
                ? instructions
                : `${questions.length - answered} question(s) are unanswered. You can submit now or return to the test.`}
            </p>
            <div className="modal-actions">
              <button
                className="secondary-btn"
                hidden={modal !== "submit"}
                id="modalCancel"
                onClick={() => setModal(null)}
              >
                Continue test
              </button>
              <button
                className="primary-btn"
                id="modalConfirm"
                onClick={() => (modal === "submit" ? finish(false) : setModal(null))}
              >
                {modal === "instructions" ? "Got it" : "Submit now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

mount(MockTest);
