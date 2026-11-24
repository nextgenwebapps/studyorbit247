export default function Hero({ searchTerm, onSearchChange, searchResults }) {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <div className="eyebrow">✦ YOUR COMPLETE EXAM PREPARATION HUB</div>
          <h1>Prepare smarter.<br /><span>Achieve bigger.</span></h1>
          <p>
            One destination for SSC, Banking, RRB, UPSC and State PCS preparation.
            Learn concepts, practice questions, attempt mock tests and track your
            progress — all in one orbit.
          </p>
          <div className="hero-buttons">
            <a className="btn btn-primary" href="#exams">Explore Exams <span>→</span></a>
            <a className="btn btn-outline" href="#subjects">Explore Subjects</a>
          </div>
          <div className="hero-search">
            <div className="site-search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search exams, subjects, chapters, tests..."
                autoComplete="off"
                aria-label="Search website content"
              />
              <button type="button" onClick={() => onSearchChange(searchTerm.trim())}>
                Search
              </button>
            </div>
            {searchTerm.trim() && (
              <div className="site-search-results" aria-live="polite">
                {searchResults.length ? (
                  searchResults.slice(0, 8).map((item) => (
                    <a
                      className="site-search-result"
                      href={item.includes("Exam") || item.includes("SSC") || item.includes("UPSC") ? "#exams" : "#subjects"}
                      key={item}
                    >
                      <strong>{item}</strong>
                      <small>Open {item} on StudyOrbit247</small>
                    </a>
                  ))
                ) : (
                  <div className="site-search-empty">
                    No matching content found. Try another keyword.
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="hero-note">
            <span>✓ Exam-focused practice</span>
            <span>✓ Performance insights</span>
            <span>✓ Learn at your pace</span>
          </div>
        </div>
      </div>
    </section>
  );
}