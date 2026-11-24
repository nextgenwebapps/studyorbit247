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

function PracticeQuestion({ question, index }) {
  const [answer, setAnswer] = useState(() => emptyAnswer(question));
  const [feedback, setFeedback] = useState("");
  const [checked, setChecked] = useState(false);

  function checkAnswer() {
    setFeedback(scoreQuestion(question, answer) ? "Correct." : "Incorrect.");
    setChecked(true);
  }

  return (
    <article className="question-panel practice-question">
      <p className="practice-question-meta">Question {index + 1} · {question.chapter} · {question.topic} · {question.level}</p>
      <Question question={question} answer={answer} onAnswer={(value) => {
        setAnswer(value);
        setFeedback("");
        setChecked(false);
      }} />
      <button type="button" className="primary-btn practice-check" disabled={!hasAnswer(answer)} onClick={checkAnswer}>
        Check Answer
      </button>
      <div role="status">
        {checked && <p className="practice-feedback">
          <strong>{feedback}</strong> Correct answer: {displayAnswer(question.correct)}.
          {question.explanation && <> {question.explanation}</>}
        </p>}
      </div>
    </article>
  );
}

function PracticePage() {
  const [filters, setFilters] = useState(() => {
    const subject = new URLSearchParams(window.location.search).get("subject");
    return { subject: subjectOptions.includes(subject) ? subject : "", exam: "", chapter: "", topic: "", level: "" };
  });
  const [results, setResults] = useState(null);
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
    setResults(findQuestions(filters));
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
        </form>
        <section className="practice-results" aria-labelledby="practice-total">
          <h2 id="practice-total" aria-live="polite">Total Questions: {results === null ? "—" : results.length}</h2>
          {results?.length === 0 && <p>No questions match these filters. Try a different subject or exam, or clear a filter.</p>}
          {results?.map((question, index) => (
            <PracticeQuestion key={searchNumber + "-" + question.id} question={question} index={index} />
          ))}
        </section>
      </main>
    </>
  );
}

mount(PracticePage);
