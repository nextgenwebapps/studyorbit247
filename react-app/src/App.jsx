import { useEffect, useState } from "react";
import Header from "./components/layout/Header.jsx";
import Footer from "./components/layout/Footer.jsx";
import Hero from "./pages/home/Hero.jsx";
import Stats from "./pages/home/Stats.jsx";
import RecentActivity from "./pages/home/RecentActivity.jsx";
import Subjects, { subjects } from "./pages/home/Subjects.jsx";
import Exams, { exams } from "./pages/home/Exams.jsx";
import Features, { features } from "./pages/home/Features.jsx";
import Practice from "./pages/home/Practice.jsx";

const ACTIVITY_KEY = "studyorbit_recent_activity";
const searchableItems = [
  ...subjects.map(([, title, description, , href]) => ({
    title,
    description,
    href: href === "mocktest/" ? href : "#subjects",
  })),
  ...exams.map(([, , title, description]) => ({ title, description, href: "#exams" })),
  ...features.map(([, title, description]) => ({ title, description, href: "#features" })),
  { title: "Start Practising", description: "Find practice questions by subject, exam, chapter, topic and level.", href: "practice/" },
];

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const query = searchTerm.trim().toLowerCase();
  const searchResults = query
    ? searchableItems.filter(({ title, description }) =>
        `${title} ${description}`.toLowerCase().includes(query),
      )
    : [];

  useEffect(() => {
    function recordActivity(event) {
      if (event.target.closest("#recent-activity")) return;

      const examCard = event.target.closest("main .exam");
      const link = event.target.closest("main a[href]");
      if (link?.getAttribute("href") === "#recent-activity") return;
      let title = "";
      let url = "";
      let type = "Learning";

      if (examCard) {
        title = examCard.querySelector("h3")?.textContent?.trim() || "";
        url = link?.closest(".exam") === examCard ? link.getAttribute("href") : "#exams";
        type = "Exam";
      } else if (link && link.getAttribute("href") !== "#") {
        title = (link.closest(".subject")?.querySelector("h3")?.textContent || link.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 90);
        url = link.getAttribute("href") || "";
        type = link.closest(".subject") ? "Subject" : "Learning";
      }

      if (!title) return;

      try {
        const saved = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
        const items = Array.isArray(saved) ? saved : [];
        const next = [
          { title, url, type, time: Date.now() },
          ...items.filter((item) => (item.title || item.name || item.label) !== title),
        ].slice(0, 8);
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event("studyorbit:recent-activity"));
      } catch (error) {
        console.warn("Could not save recent activity.", error);
      }
    }

    document.addEventListener("click", recordActivity);
    return () => document.removeEventListener("click", recordActivity);
  }, []);

  return (
    <div className="min-h-screen antialiased">
      <Header />
      <main className="home-content">
        <Hero searchTerm={searchTerm} onSearchChange={setSearchTerm} searchResults={searchResults} />
        <Stats />
        <RecentActivity />
        <Subjects />
        <Exams />
        <Features />
        <Practice />
      </main>
      <Footer />
    </div>
  );
}
