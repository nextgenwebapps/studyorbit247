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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

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
              <span className="nav-icon"><UserIcon /></span>
              Login / Sign Up
            </a>
            <a className="admin-link" href="admin/">
              <span className="nav-icon"><AdminIcon /></span>
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
              <span className="nav-icon"><ProductsIcon /></span>
              Our Products
              <span className="products-chevron" aria-hidden="true">{productsOpen ? "⌃" : "⌄"}</span>
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