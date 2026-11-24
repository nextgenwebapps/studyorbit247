import { useState } from "react";

const productLinks = [
  ["💼", "Government Job Exams", "mocktest/"],
  ["🎓", "College Entrance Exams", "mocktest/"],
  ["⏱️", "Mock Test", "mocktest/"],
  ["✍️", "Practice Sets", "mocktest/"],
  ["🧪", "Test Series", "mocktest/"],
];

const comingSoon = [
  ["📄", "Previous Year Questions"],
  ["📚", "Study Notes"],
  ["📖", "Ebooks"],
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container nav">
        <a className="brand" href="#" aria-label="StudyOrbit247 home">
          <span>Study<em>Orbit</em>247</span>
        </a>

        <button
          className="menu"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          ☰
        </button>

        <nav className={`account-nav ${mobileOpen ? "mobile-open" : ""}`}>
          <div className="auth-links">
            <a className="signup-link" href="user/">
              <span className="nav-icon" aria-hidden="true">♙</span>
              Login / Sign Up
            </a>
            <a className="admin-link" href="admin/">
              <span className="nav-icon" aria-hidden="true">♢</span>
              Login as Admin
            </a>
          </div>

          <div className="products-menu">
            <button
              className="products-trigger"
              type="button"
              aria-expanded={productsOpen}
              aria-controls="products-panel"
              onClick={() => setProductsOpen((open) => !open)}
            >
              <span className="nav-icon" aria-hidden="true">▦</span>
              Our Products
              <span className="products-chevron">⌄</span>
            </button>

            <div
              id="products-panel"
              className={`products-panel ${productsOpen ? "products-open" : ""}`}
              aria-label="Our Products"
            >
              <div className="products-panel-inner">
                {productLinks.map(([icon, label, href]) => (
                  <a href={href} key={label}>
                    <span className="product-tile-icon">{icon}</span>
                    <span>{label}</span>
                  </a>
                ))}
                {comingSoon.map(([icon, label]) => (
                  <div className="product-coming" key={label}>
                    <span className="product-tile-icon">{icon}</span>
                    <span>{label}</span>
                    <small>Coming soon</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}