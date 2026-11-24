export default function TestHeader({ category, mode, onInstructions, homeHref = "../", instructionsId }) {
  return (
    <header className="topbar">
      <a className="brand" href={homeHref}>
        <span>Study<em>Orbit</em>247</span>
      </a>
      <div className="test-meta">
        <span className="live-dot" aria-hidden="true" />
        <span>{category}</span>
        <span className="meta-divider" aria-hidden="true">/</span>
        <span>{mode}</span>
      </div>
      <button type="button" className="icon-btn" id={instructionsId} onClick={onInstructions} title="Instructions" aria-label="Instructions">
        ⓘ
      </button>
    </header>
  );
}
