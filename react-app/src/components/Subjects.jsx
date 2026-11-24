import { useState } from "react";

const BATCH_SIZE = 4;

export const subjects = [
  ["🌍", "GK / GS", "Static GK, current affairs, history, geography, polity and science.", "ic-blue", "mocktest/"],
  ["🧩", "Reasoning", "Verbal and non-verbal reasoning, puzzles, series and logic.", "ic-green", "#reasoning"],
  ["➗", "Quantitative Aptitude", "Arithmetic, algebra, number system, DI and advanced maths.", "ic-orange", "#quant"],
  ["🔤", "English", "Grammar, vocabulary, comprehension, cloze test and usage.", "ic-purple", "#english"],
  ["अ", "Hindi", "व्याकरण, शब्दावली, अपठित गद्यांश और भाषा अभ्यास।", "ic-pink", "#hindi"],
  ["📜", "History", "Ancient, medieval and modern Indian history topics.", "ic-blue", "mocktest/"],
  ["🗺️", "Geography", "Physical, Indian and world geography practice.", "ic-green", "mocktest/"],
  ["⚖️", "Indian Polity", "Constitution, governance, Parliament and public policy.", "ic-orange", "mocktest/"],
  ["💹", "Indian Economy", "Basic economics, budget, banking and economic updates.", "ic-purple", "mocktest/"],
  ["🔬", "General Science", "Everyday science and exam-focused science concepts.", "ic-pink", "mocktest/"],
  ["📰", "Current Affairs", "Important national and international events.", "ic-blue", "mocktest/"],
  ["⚡", "Physics", "Motion, force, energy, light and basic physics.", "ic-green", "mocktest/"],
  ["🧪", "Chemistry", "Elements, reactions, acids, bases and everyday chemistry.", "ic-orange", "mocktest/"],
  ["🧬", "Biology", "Human body, plants, cells and life science.", "ic-purple", "mocktest/"],
  ["💻", "Computer Awareness", "Computer fundamentals, internet and digital knowledge.", "ic-pink", "mocktest/"],
  ["🔗", "Analogy", "Word, number and figure analogy questions.", "ic-blue", "mocktest/"],
  ["🔢", "Number Series", "Missing number, pattern and sequence practice.", "ic-green", "mocktest/"],
  ["🔐", "Coding-Decoding", "Letter, number and symbol coding questions.", "ic-orange", "mocktest/"],
  ["👥", "Blood Relations", "Family tree and relationship-based reasoning.", "ic-purple", "mocktest/"],
  ["🧭", "Direction Sense", "Direction, distance and position problems.", "ic-pink", "mocktest/"],
  ["🔍", "Syllogism", "Statements, conclusions and logical deductions.", "ic-blue", "mocktest/"],
  ["🧩", "Puzzles", "Seating arrangement and logical puzzle practice.", "ic-green", "mocktest/"],
  ["➕", "Simplification", "BODMAS, fractions, decimals and approximation.", "ic-orange", "mocktest/"],
  ["🔣", "Number System", "Integers, divisibility, factors and remainders.", "ic-purple", "mocktest/"],
  ["📊", "Data Interpretation", "Tables, charts, graphs and data-based questions.", "ic-pink", "mocktest/"],
];

export default function Subjects() {
  const [visibleExtraCount, setVisibleExtraCount] = useState(0);
  const extraSubjects = subjects.slice(5);
  const hasMore = visibleExtraCount < extraSubjects.length;
  const hasShown = visibleExtraCount > 0;

  function handleToggle(event) {
    if (event.target.closest(".subject-action-less")) {
      setVisibleExtraCount((count) => Math.max(0, count - BATCH_SIZE));
      return;
    }

    setVisibleExtraCount((count) =>
      Math.min(extraSubjects.length, count + BATCH_SIZE),
    );
  }

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
          {subjects.map(([icon, title, description, color, href], index) => {
            const isExtra = index >= 5;
            const isHidden = isExtra && index - 5 >= visibleExtraCount;

            return (
              <article
                className={`subject ${isExtra ? "subject-extra" : ""}`}
                key={title}
                hidden={isHidden}
              >
                <div className={`subject-icon ${color}`}>{icon}</div>
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="subject-actions">
                  <a href={href}>
                    {title === "Hindi" ? "अभ्यास करें →" : "Practice now →"}
                  </a>
                  <a href={href} className="subject-explore-link">Explore now →</a>
                </div>
              </article>
            );
          })}

          <button
            id="show-more-subjects"
            className={`subject subject-more-toggle ${hasShown ? "is-expanded" : ""} ${!hasMore && hasShown ? "is-at-end" : ""}`}
            type="button"
            aria-label={
              hasMore && hasShown
                ? "Show more or show less subjects"
                : hasMore
                  ? "Show more subjects"
                  : "Show less subjects"
            }
            aria-expanded={hasShown}
            hidden={!hasMore && !hasShown}
            onClick={handleToggle}
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