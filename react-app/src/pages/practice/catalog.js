import questionBank from "../mocktest/questions.json";

const gk = "GK / GS";
const classifications = {
  gk01: ["Indian Polity", "Constitution", "Fundamental Rights", "Easy"],
  gk02: ["Indian Polity", "Constitution", "Constitutional Bodies", "Medium"],
  gk03: ["Geography", "Indian Geography", "Latitudes", "Easy"],
  gk04: ["Geography", "Indian Geography", "River Systems", "Medium"],
  gk05: ["Indian Economy", "Banking", "Reserve Bank of India", "Easy"],
  gk06: ["Indian Polity", "Constitution", "Schedules", "Medium"],
  gk07: ["History", "Art and Culture", "Classical Dance", "Medium"],
  gk08: ["History", "Modern Indian History", "Freedom Movement", "Hard"],
  gk09: ["Indian Polity", "Union Government", "President", "Medium"],
  gk10: ["Geography", "Indian Geography", "Monsoon", "Easy"],
  gk11: ["Indian Polity", "Union Government", "Parliament", "Hard"],
  gk12: ["Data Interpretation", "Tables", "Reading Values", "Easy"],
};

const samples = [
  {
    id: "practice-reasoning-1",
    type: "mcq",
    prompt: "What comes next in the sequence 3, 6, 12, 24?",
    options: ["30", "36", "42", "48"],
    correct: "48",
    explanation: "Each term is double the previous term.",
    subjects: ["Reasoning", "Number Series"],
    exams: ["SSC Exams", "Banking Exams", "RRB Exams"],
    chapter: "Series",
    topic: "Number Series",
    level: "Easy",
  },
  {
    id: "practice-quant-1",
    type: "mcq",
    prompt: "What is 15% of 240?",
    options: ["24", "30", "36", "42"],
    correct: "36",
    explanation: "Multiply 240 by 15 and divide by 100.",
    subjects: ["Quantitative Aptitude"],
    exams: ["SSC Exams", "Banking Exams", "RRB Exams"],
    chapter: "Arithmetic",
    topic: "Percentages",
    level: "Easy",
  },
  {
    id: "practice-english-1",
    type: "mcq",
    prompt: "Choose the correct verb: Each of the students ___ a book.",
    options: ["have", "has", "are", "were"],
    correct: "has",
    explanation: "The subject is 'Each', which takes a singular verb.",
    subjects: ["English"],
    exams: ["SSC Exams", "Banking Exams"],
    chapter: "Grammar",
    topic: "Subject–Verb Agreement",
    level: "Medium",
  },
  {
    id: "practice-hindi-1",
    type: "mcq",
    prompt: "‘अंधकार’ का विलोम शब्द कौन-सा है?",
    options: ["प्रकाश", "रात्रि", "छाया", "संध्या"],
    correct: "प्रकाश",
    explanation: "‘अंधकार’ का अर्थ अँधेरा है। इसका विलोम ‘प्रकाश’ है।",
    subjects: ["Hindi"],
    exams: ["State PCS", "Teaching Exams"],
    chapter: "शब्दावली",
    topic: "विलोम शब्द",
    level: "Easy",
  },
];

export const questions = [
  ...questionBank.questions
    .filter(({ id }) => classifications[id])
    .map((question) => {
      const [subject, chapter, topic, level] = classifications[question.id];
      const isDataInterpretation = subject === "Data Interpretation";
      return {
        ...question,
        subjects: isDataInterpretation ? ["Quantitative Aptitude", subject] : [gk, subject],
        exams: isDataInterpretation || subject === "Indian Economy"
          ? ["SSC Exams", "Banking Exams", "RRB Exams"]
          : ["SSC Exams", "RRB Exams", "UPSC", "State PCS"],
        chapter,
        topic,
        level,
      };
    }),
  ...samples,
];

export function findQuestions(filters) {
  const { subject, exam, chapter, topic, level } = filters;
  return questions.filter((question) =>
    (!subject || question.subjects.includes(subject)) &&
    (!exam || question.exams.includes(exam)) &&
    (!chapter || question.chapter === chapter) &&
    (!topic || question.topic === topic) &&
    (!level || question.level === level),
  );
}

export function matchesPracticeFilters(question, { status, source }, bookmarks, attempts) {
  const isPyq = question.isPyq === true || question.source === "pyq";
  if (source === "PYQs Only" && !isPyq) return false;
  if (source === "Practice Questions Only" && isPyq) return false;

  const outcome = attempts[question.id]?.status;
  switch (status) {
    case "Bookmarked": return bookmarks.includes(question.id);
    case "Unattempted": return !outcome;
    case "Attempted": return Boolean(outcome);
    case "Correct": return outcome === "correct";
    case "Incorrect": return outcome === "incorrect";
    default: return true;
  }
}
