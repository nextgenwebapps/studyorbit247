import { useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Hero from "./components/Hero.jsx";
import Stats from "./components/Stats.jsx";
import RecentActivity from "./components/RecentActivity.jsx";
import Subjects from "./components/Subjects.jsx";
import Exams from "./components/Exams.jsx";
import Features from "./components/Features.jsx";
import Practice from "./components/Practice.jsx";

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