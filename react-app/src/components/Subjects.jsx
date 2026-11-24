import { useState } from "react";

const subjects = [
  ["🌍", "GK / GS", "Static GK, current affairs, history, geography, polity and science.", "ic-blue"],
  ["🧩", "Reasoning", "Verbal and non-verbal reasoning, puzzles, series and logic.", "ic-green"],
  ["➗", "Quantitative Aptitude", "Arithmetic, algebra, number system, DI and advanced maths.", "ic-orange"],
  ["🔤", "English", "Grammar, vocabulary, comprehension, cloze test and usage.", "ic-purple"],
  ["अ", "Hindi", "व्याकरण, शब्दावली, अपठित गद्यांश और भाषा अभ्यास।", "ic-pink"],
  ["📜", "History", "Ancient, medieval and modern Indian history topics.", "ic-blue"],
  ["🗺️", "Geography", "Physical, Indian and world geography practice.", "ic-green"],
  ["⚖️", "Indian Polity", "Constitution, governance, Parliament and public policy.", "ic-orange"],
  ["💹", "Indian Economy", "Basic economics, budget, banking and economic updates.", "ic-purple"],
  ["🔬", "General Science", "Everyday science and exam-focused science concepts.", "ic-pink"],
  ["📰", "Current Affairs", "Important national and international events.", "ic-blue"],
  ["⚡", "Physics", "Motion, force, energy, light and basic physics.", "ic-green"],
  ["🧪", "Chemistry", "Elements, reactions, acids, bases and everyday chemistry.", "ic-orange"],
  ["🧬", "Biology", "Human body, plants, cells and life science.", "ic-purple"],
  ["💻", "Computer Awareness", "Computer fundamentals, internet and digital knowledge.", "ic-pink"],
  ["🔗", "Analogy", "Word, number and figure analogy questions.", "ic-blue"],
  ["🔢", "Number Series", "Missing number, pattern and sequence practice.", "ic-green"],
  ["🔐", "Coding-Decoding", "Letter, number and symbol coding questions.", "ic-orange"],
  ["👥", "Blood Relations", "Family tree and relationship-based reasoning.", "ic-purple"],
  ["🧭", "Direction Sense", "Direction, distance and position problems.", "ic-pink"],
  ["🔍", "Syllogism", "Statements, conclusions and logical deductions.", "ic-blue"],
  ["🧩", "Puzzles", "Seating arrangement and logical puzzle practice.", "ic-green"],
  ["➕", "Simplification", "BODMAS, fractions, decimals and approximation.", "ic-orange"],
  ["🔣", "Number System", "Integers, divisibility, factors and remainders.", "ic-purple"],
  ["📊", "Data Interpretation", "Tables, charts, graphs and data-based questions.", "ic-pink"],
];

export default function Subjects() {
  const [expanded, setExpanded] = useState(false);
  const visibleSubjects = expanded ? subjects : subjects.slice(0, 5);

  return (
    <section id="subjects">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="kicker">LEARN BY SUBJECT</div>
            <h2>Explore Subjects</h2>
            <p>Choose a subject and start practising.</p>
          </div>
        </div>
        <div className="subject-grid">
          {visibleSubjects.map(([icon, title, description, color], index) => (
            <article className={`subject ${index >= 5 ? "subject-extra" : ""}`} key={title}>
              <div className={`subject-icon ${color}`}>{icon}</div>
              <h3>{title}</h3>
              <p>{description}</p>
              <div className="subject-actions">
                <a href="mocktest/">Practice now →</a>
                <a href="mocktest/" className="subject-explore-link">Explore now →</a>
              </div>
            </article>
          ))}
          <button
            id="show-more-subjects"
            className="subject subject-more-toggle"
            type="button"
            aria-label={expanded ? "Show fewer subjects" : "Show more subjects"}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            <span className="subject-action-more">
              <span className="subject-action-icon" aria-hidden="true">＋</span>
              <span>Show More</span>
            </span>
            <span className="subject-action-less">
              <span className="subject-action-icon" aria-hidden="true">−</span>
              <span>Show Less</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}