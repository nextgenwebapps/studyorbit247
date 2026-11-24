import { useState } from "react";

const BATCH_SIZE = 4;

const exams = [
  ["🏛️", "CENTRAL GOVT.", "SSC Exams", "CGL, CHSL, MTS, GD, CPO and other SSC examinations.", "Tier-wise practice"],
  ["🏦", "BANKING", "Banking Exams", "IBPS PO/Clerk, SBI PO/Clerk, RRB and RBI preparation.", "Prelims + Mains"],
  ["🚆", "RAILWAY", "RRB Exams", "RRB NTPC, Group D, ALP, Technician and Junior Engineer preparation.", "CBT + skill tests"],
  ["🇮🇳", "CIVIL SERVICES", "UPSC", "Prelims, GS, CSAT, current affairs and concept revision.", "Foundation to practice"],
  ["📍", "STATE LEVEL", "State PCS", "UPPCS, UKPSC, BPSC, MPPSC, RPSC and other state exams.", "State-specific GK"],
  ["🎓", "NATIONAL ELIGIBILITY", "UGC NET", "Teaching and research eligibility preparation for UGC NET.", "Paper 1 + Paper 2"],
  ["🏫", "COLLEGE ENTRANCE", "College Entrance Exams", "Entrance preparation for undergraduate and postgraduate college admissions.", "UG + PG entrance"],
  ["🪖", "DEFENCE", "Defence Exams", "NDA, CDS, AFCAT and other defence recruitment examinations.", "Written exam practice"],
  ["👩‍🏫", "TEACHING", "Teaching Exams", "CTET, State TET and other teacher eligibility examinations.", "Paper-wise practice"],
  ["🩺", "MEDICAL", "NEET", "Medical entrance preparation covering Biology, Physics and Chemistry.", "Entrance practice"],
  ["🧑‍⚕️", "MEDICAL", "NEET PG", "Postgraduate medical entrance preparation and subject revision.", "Subject revision"],
  ["💊", "PHARMACY", "Pharmacy Entrance", "Pharmacy admission and aptitude examinations.", "Entrance practice"],
  ["📋", "COMMERCE", "CA Foundation", "Chartered Accountancy foundation-level preparation.", "Foundation practice"],
  ["📚", "COMMERCE", "CS Executive", "Company Secretary executive programme preparation.", "Professional exam"],
  ["⚖️", "LAW", "Judiciary Exams", "State judicial services examination practice.", "Law practice"],
  ["🚔", "STATE LEVEL", "Police Exams", "Police constable and sub-inspector recruitment tests.", "Recruitment practice"],
  ["🍎", "TEACHING", "State Teacher Exams", "State-level teacher recruitment examination practice.", "Teacher recruitment"],
  ["🛠️", "TECHNICAL", "Apprentice Exams", "Apprenticeship recruitment and technical aptitude tests.", "Technical practice"],
  ["🛡️", "INSURANCE", "Insurance Exams", "LIC, NIACL and other insurance recruitment tests.", "Recruitment practice"],
  ["🧾", "COMMERCE", "CMA Foundation", "Cost and Management Accountancy foundation preparation.", "Foundation practice"],
  ["🏛️", "ENTRANCE", "CUET UG", "Common University Entrance Test undergraduate preparation.", "UG entrance"],
  ["🎓", "ENTRANCE", "CUET PG", "Postgraduate university entrance examination practice.", "PG entrance"],
  ["🧑‍💻", "TECHNICAL", "GATE", "Graduate Aptitude Test in Engineering preparation.", "Engineering practice"],
  ["🏗️", "TECHNICAL", "Engineering Services", "Engineering Services Examination preparation.", "Technical practice"],
  ["🚢", "MARITIME", "Merchant Navy Exams", "Merchant Navy admission and selection test practice.", "Entrance practice"],
  ["✈️", "AVIATION", "Aviation Exams", "Aviation entrance and recruitment examination practice.", "Entrance practice"],
  ["🏦", "BANKING", "NABARD Exams", "Agriculture, rural development and banking preparation.", "Banking practice"],
  ["📈", "FINANCE", "SEBI Exams", "Securities market and regulatory recruitment preparation.", "Recruitment practice"],
  ["🗂️", "PUBLIC SECTOR", "PSU Recruitment", "Public sector undertaking recruitment examination practice.", "Recruitment practice"],
];

export default function Exams() {
  const [visibleExtraCount, setVisibleExtraCount] = useState(0);
  const extraExams = exams.slice(5);
  const hasMore = visibleExtraCount < extraExams.length;
  const hasShown = visibleExtraCount > 0;

  function handleToggle(event) {
    const clickedLess = event.target.closest(".exam-action-less");

    if (clickedLess) {
      setVisibleExtraCount((count) => Math.max(0, count - BATCH_SIZE));
      return;
    }

    setVisibleExtraCount((count) =>
      Math.min(extraExams.length, count + BATCH_SIZE),
    );
  }

  return (
    <section className="exam-section" id="exams">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="kicker">PREPARE WITH A CLEAR GOAL</div>
            <h2>Explore Exams</h2>
            <p>Select your target examination to begin preparation.</p>
          </div>
        </div>

        <div className="exam-grid">
          {exams.map(([icon, tag, title, description, detail], index) => {
            const isExtra = index >= 5;
            const isHidden = isExtra && index - 5 >= visibleExtraCount;

            return (
              <article
                className={`exam ${isExtra ? "exam-extra" : ""}`}
                key={title}
                hidden={isHidden}
              >
                <div className="exam-top">
                  <div className="exam-icon">{icon}</div>
                  <span className="tag">{tag}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="exam-foot">
                  <span>{detail}</span>
                  <a href="mocktest/"><b>Explore →</b></a>
                </div>
              </article>
            );
          })}

          <button
            id="show-more-exams"
            className={`exam ${hasShown ? "is-expanded" : ""} ${!hasMore && hasShown ? "is-at-end" : ""}`}
            type="button"
            aria-label={
              hasMore && hasShown
                ? "Show more or show less exams"
                : hasMore
                  ? "Show more exams"
                  : "Show less exams"
            }
            aria-expanded={hasShown}
            hidden={!hasMore && !hasShown}
            onClick={handleToggle}
          >
            <span className="exam-action-more">
              <span className="exam-action-icon" aria-hidden="true">＋</span>
              <span>Show More</span>
            </span>
            <span className="exam-action-less">
              <span className="exam-action-icon" aria-hidden="true">−</span>
              <span>Show Less</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}