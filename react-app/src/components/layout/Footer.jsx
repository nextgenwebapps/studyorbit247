const footerGroups = [
  {
    title: "Subjects",
    links: [
      ["GK / GS", "#subjects"],
      ["Reasoning", "#subjects"],
      ["Quantitative Aptitude", "#subjects"],
      ["English & Hindi", "#subjects"],
    ],
  },
  {
    title: "Examinations",
    links: [
      ["SSC", "#exams"],
      ["Banking", "#exams"],
      ["RRB", "#exams"],
      ["UPSC", "#exams"],
      ["State PCS", "#exams"],
    ],
  },
  {
    title: "StudyOrbit247",
    links: [
      ["Features", "#features"],
      ["Mock Tests", "mocktest/"],
      ["Practice", "#subjects"],
      ["Admin Login", "admin/"],
    ],
  },
];

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <a className="brand footer-brand" href="#">
              <span>Study<em>Orbit</em>247</span>
            </a>
            <p>
              Your exam preparation companion for learning, practice and
              progress across SSC, Banking, RRB, UPSC and State PCS examinations.
            </p>
          </div>
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h4>{group.title}</h4>
              {group.links.map(([label, href]) => (
                <a href={href} key={label}>{label}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="copyright">
          <span>© 2026 StudyOrbit247. All rights reserved.</span>
          <span>Learn • Practice • Progress</span>
        </div>
      </div>
    </footer>
  );
}