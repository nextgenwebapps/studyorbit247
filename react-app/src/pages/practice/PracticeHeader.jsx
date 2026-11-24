export default function PracticeHeader({ onInstructions }) {
  return (
    <header className="topbar">
      <a className="brand" href="../">
        <span>Study<em>Orbit</em>247</span>
      </a>
      <div className="test-meta">
        <span className="live-dot" aria-hidden="true" />
        <span>QUESTION BANK</span>
        <span className="meta-divider" aria-hidden="true">/</span>
        <span>PRACTICE NOW</span>
      </div>
      <button type="button" className="icon-btn" onClick={onInstructions} title="Instructions" aria-label="Instructions">
        ⓘ
      </button>
    </header>
  );
}
