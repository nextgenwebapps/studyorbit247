import { useState } from "react";
import { createQuestion, typeLabel } from "./lib/question-model.js";
import { QUESTION_TYPES } from "./lib/config.js";
import { csvTemplate, parseImportFile } from "./lib/bulk-import.js";

const additionalFormats = [
  ["reading_comprehension", "Reading comprehension", "passage"],
  ["cloze", "Cloze test", "passage"],
  ["map", "Map based", "image"],
  ["graph", "Graph / table / chart based", "data_interpretation"],
  ["statement_conclusion", "Statement and conclusion", "statement_set"],
  ["statement_assumption", "Statement and assumption", "statement_set"],
  ["syllogism", "Syllogism", "statement_set"],
  ["direction", "Direction sense", "reasoning"],
  ["blood_relation", "Blood relation", "reasoning"],
  ["number_series", "Alphabet / number series", "coding_decoding"],
  ["puzzle", "Puzzle / seating arrangement", "reasoning"],
  ["formula", "Formula / equation based", "numerical"],
  ["descriptive", "Descriptive answer", "descriptive"],
];
const questionFormats = [...QUESTION_TYPES, ...additionalFormats];

const subjects = [
  "General Knowledge",
  "General Studies",
  "Reasoning",
  "Mathematics",
  "English",
  "Hindi",
  "Science",
  "Computer",
  "Current Affairs",
];
const exams = [
  "SSC CGL",
  "SSC CHSL",
  "SSC MTS",
  "Banking",
  "Railway",
  "UPSC",
  "State PCS",
  "College Entrance",
  "Other",
];
const groupTypes = [
  ["passage", "Passage / comprehension"],
  ["data_interpretation", "Data interpretation / chart"],
  ["caselet", "Caselet"],
  ["image", "Image / map / diagram"],
];

export function newQuestion(overrides) {
  return createQuestion({ subject: subjects[0], exam: exams[0], ...overrides });
}

function Select({ label, options, value, onChange }) {
  const entries = options.map((option) => (Array.isArray(option) ? option : [option, option]));
  if (value && !entries.some(([key]) => key === value)) entries.unshift([value, value]);
  return (
    <div className="field">
      <label>
        {label}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {!value && <option value="">Select {label.toLowerCase()}</option>}
          {entries.map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Area({ label, value, onChange, large }) {
  return (
    <div className="field full-width">
      <label>
        {label}
        <textarea
          className={large ? "large" : undefined}
          placeholder={`Enter ${label.toLowerCase()}`}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

export function QuestionPreview({ question, device }) {
  return (
    <div className={`preview-stage ${device}`} id="preview-stage">
      {question ? (
        <article className="preview-question">
          <div>
            <b>{question.exam || "Exam"}</b> · {question.subject || "Subject"}
          </div>
          {question.sharedContent && (
            <>
              <div className="lang-label">PASSAGE / SHARED CONTENT</div>
              {question.sharedContent.en}
              <hr />
              {question.sharedContent.hi}
            </>
          )}
          <div className="lang-label">ENGLISH</div>
          <div>{question.question?.en}</div>
          <div className="lang-label">हिंदी</div>
          <div lang="hi">{question.question?.hi}</div>
          {question.options?.map((option) => (
            <div key={option.id} className="option">
              {option.id}. {option.en}
              <br />
              <span lang="hi">{option.hi}</span>
            </div>
          ))}
        </article>
      ) : (
        <div className="preview-empty">Add a question to see its preview.</div>
      )}
    </div>
  );
}

function QuestionFields({ question, onChange }) {
  const options = question.options || [];
  const correct = question.correct || [];
  const multiple = question.type === "multiple_mcq";
  const set = (field, value) => onChange({ ...question, [field]: value });
  const bilingual = (field, label, large) =>
    [
      ["en", "English"],
      ["hi", "Hindi"],
    ].map(([lang, language]) => (
      <Area
        key={lang}
        label={`${label} (${language})`}
        large={large}
        value={question[field]?.[lang]}
        onChange={(value) => set(field, { ...question[field], [lang]: value })}
      />
    ));

  function editOption(id, lang, value) {
    set(
      "options",
      options.map((option) => (option.id === id ? { ...option, [lang]: value } : option)),
    );
  }

  return (
    <>
      <div className="eyebrow">QUESTION DETAILS</div>
      <div className="field-grid">
        <Select
          label="Question type"
          options={questionFormats}
          value={question.format || question.type}
          onChange={(format) => {
            const type = additionalFormats.find(([key]) => key === format)?.[2] ?? format;
            onChange({
              ...question,
              type,
              format: format === type ? undefined : format,
              correct: type === "multiple_mcq" ? correct : correct.slice(0, 1),
            });
          }}
        />
        <Select
          label="Subject"
          options={subjects}
          value={question.subject}
          onChange={(value) => set("subject", value)}
        />
        <Select label="Exam" options={exams} value={question.exam} onChange={(value) => set("exam", value)} />
        <div className="field">
          <label>
            Chapter
            <input
              placeholder="Chapter name"
              value={question.chapter ?? ""}
              onChange={(event) => set("chapter", event.target.value)}
            />
          </label>
        </div>
        <Select
          label="Difficulty"
          options={["easy", "medium", "hard"]}
          value={question.difficulty}
          onChange={(value) => set("difficulty", value)}
        />
        {[
          ["marks", "Marks"],
          ["negativeMarks", "Negative marks"],
        ].map(([field, label]) => (
          <div key={field} className="field">
            <label>
              {label}
              <input
                type="number"
                step="any"
                value={question[field] ?? ""}
                onChange={(event) => set(field, event.target.value)}
              />
            </label>
          </div>
        ))}
        <div className="field">
          <label>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={Boolean(question.isPyq)}
              onChange={(event) => set("isPyq", event.target.checked)}
            />{" "}
            Previous year question (PYQ)
          </label>
        </div>
      </div>
      <hr className="section-divider" />
      {(question.sharedContent || groupTypes.some(([type]) => type === question.type)) &&
        bilingual("sharedContent", "Shared content", true)}
      {bilingual("question", "Question", true)}
      <h3 className="builder-section-title">Answer options</h3>
      <p className="import-help">
        Fill both languages. Choose the correct answer. Multiple-correct type allows more than one.
      </p>
      <div id="options-editor">
        {options.map((option) => (
          <div key={option.id} className="option-editor">
            <span className="option-key">{option.id}</span>
            <input
              aria-label={`Option ${option.id} in English`}
              placeholder="Option in English"
              value={option.en ?? ""}
              onChange={(event) => editOption(option.id, "en", event.target.value)}
            />
            <input
              aria-label={`Option ${option.id} in Hindi`}
              placeholder="विकल्प हिंदी में"
              value={option.hi ?? ""}
              onChange={(event) => editOption(option.id, "hi", event.target.value)}
            />
            <label>
              <input
                type={multiple ? "checkbox" : "radio"}
                name="correct"
                checked={correct.includes(option.id)}
                onChange={(event) =>
                  set(
                    "correct",
                    multiple
                      ? event.target.checked
                        ? [...correct, option.id]
                        : correct.filter((id) => id !== option.id)
                      : [option.id],
                  )
                }
              />{" "}
              Correct
            </label>
          </div>
        ))}
      </div>
      <button
        className="add-option"
        onClick={() => {
          const id = String.fromCharCode(65 + options.length);
          set("options", [...options, { id, en: "", hi: "" }]);
        }}
      >
        ＋ Add option
      </button>
      <hr className="section-divider" />
      {bilingual("explanation", "Explanation")}
    </>
  );
}

function BulkImport({ onImport }) {
  const [result, setResult] = useState("");

  async function importFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const items = await parseImportFile(file);
      onImport(items);
      setResult(`${items.length} questions imported as drafts. Review and validate each item.`);
    } catch (error) {
      setResult(error.message);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([csvTemplate], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "studyorbit-question-template.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <>
      <div className="eyebrow">IMPORT CENTER</div>
      <h2 className="builder-section-title">Import multiple questions</h2>
      <div className="import-drop">
        <b>Choose a CSV or JSON file</b>
        <p className="import-help">
          Prepare bilingual question text, bilingual options, answer key and metadata. Every imported row
          becomes an editable draft.
        </p>
        <input aria-label="CSV or JSON file" type="file" accept=".csv,.json" onChange={importFile} />
      </div>
      <hr className="section-divider" />
      <p className="import-help">
        CSV template columns: type, subject, chapter, exam, question_en, question_hi, option_a_en, option_a_hi
        … option_d_hi, correct, explanation_en, explanation_hi.
      </p>
      <button className="secondary" onClick={download}>
        Download CSV template
      </button>
      <div className="import-help" role="status">
        {result}
      </div>
    </>
  );
}

export function QuestionBuilder({ mode, question, onChange, drafts, onImport, onEdit }) {
  const [subject, setSubject] = useState(subjects[0]);
  const [exam, setExam] = useState(exams[0]);
  const [type, setType] = useState(groupTypes[0][0]);
  const [shared, setShared] = useState({ en: "", hi: "" });
  const [added, setAdded] = useState([]);
  if (mode === "single") return <QuestionFields question={question} onChange={onChange} />;
  if (mode === "bulk") return <BulkImport onImport={onImport} />;
  const grouped = mode === "group";

  function add() {
    const item = newQuestion({ subject, exam, ...(grouped ? { type, sharedContent: { ...shared } } : {}) });
    onImport([item]);
    setAdded((items) => [...items, item.id]);
  }

  return (
    <>
      <div className="eyebrow">{grouped ? "SHARED CONTENT SET" : "MULTIPLE ENTRY"}</div>
      <h2 className="builder-section-title">
        {grouped ? "Passage, chart, image or caselet + linked questions" : "Add a set of questions"}
      </h2>
      {grouped ? (
        <>
          <Select label="Group type" options={groupTypes} value={type} onChange={setType} />
          <Area
            label="Shared content (English)"
            value={shared.en}
            onChange={(en) => setShared({ ...shared, en })}
            large
          />
          <Area
            label="Shared content (Hindi)"
            value={shared.hi}
            onChange={(hi) => setShared({ ...shared, hi })}
            large
          />
        </>
      ) : (
        <p className="import-help">Create several independent questions in one session.</p>
      )}
      <div className="field-grid">
        <Select label="Subject" options={subjects} value={subject} onChange={setSubject} />
        <Select label="Exam" options={exams} value={exam} onChange={setExam} />
      </div>
      <button className="primary" onClick={add}>
        {grouped ? "＋ Add linked question" : "＋ Add question to set"}
      </button>
      <div className="question-list mt-3">
        {drafts
          .filter((item) => added.includes(item.id))
          .map((item, index) => (
            <div key={item.id} className="question-row">
              <div>
                <strong>
                  {grouped ? "Linked question" : "Question"} {index + 1}
                </strong>
                <small>{grouped ? typeLabel(item.type) : `${item.subject} · ${item.exam}`}</small>
              </div>
              <button className="text-button" onClick={() => onEdit(item)}>
                Edit
              </button>
            </div>
          ))}
      </div>
    </>
  );
}
