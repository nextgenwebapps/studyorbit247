import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Hero from "./components/Hero.jsx";
import Stats from "./components/Stats.jsx";
import RecentActivity from "./components/RecentActivity.jsx";
import Subjects from "./components/Subjects.jsx";
import Exams from "./components/Exams.jsx";
import Features from "./components/Features.jsx";
import Practice from "./components/Practice.jsx";

const ACTIVITY_KEY = "studyorbit_recent_activity";

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const searchableItems = useMemo(
    () => [
      "GK / GS", "Reasoning", "Quantitative Aptitude", "English", "Hindi",
      "History", "Geography", "Indian Polity", "Indian Economy",
      "General Science", "Current Affairs", "Physics", "Chemistry", "Biology",
      "Computer Awareness", "Analogy", "Number Series", "Coding-Decoding",
      "Blood Relations", "Direction Sense", "Syllogism", "Puzzles",
      "Simplification", "Number System", "Data Interpretation",
      "SSC Exams", "Banking Exams", "RRB Exams", "UPSC", "State PCS",
      "UGC NET", "College Entrance Exams", "Defence Exams", "Teaching Exams",
    ],
    [],
  );

  const searchResults = searchTerm.trim()
    ? searchableItems.filter((item) =>
        item.toLowerCase().includes(searchTerm.trim().toLowerCase()),
      )
    : [];

  useEffect(() => {
    function recordActivity(event) {
      if (event.target.closest("#recent-activity")) return;

      const examCard = event.target.closest("main .exam");
      const link = event.target.closest("main a[href]");
      let title = "";
      let url = "";
      let type = "Learning";

      if (examCard) {
        title = examCard.querySelector("h3")?.textContent?.trim() || "";
        url = link?.closest(".exam") === examCard
          ? link.getAttribute("href")
          : "#exams";
        type = "Exam";
      } else if (link && link.getAttribute("href") !== "#") {
        title = (link.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 90);
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
        <Hero
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchResults={searchResults}
        />
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