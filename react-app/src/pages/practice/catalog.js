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

function classifyBankQuestion(question, index) {
  const legacy = classifications[question.id];
  if (legacy) return legacy;

  const match = String(question.id ?? "").match(/(\\d+)$/);
  const number = Number(match?.[1] ?? index + 1);
  if (number <= 20) return ["Indian Polity", "Indian Polity", "Constitution and Governance", "Easy"];
  if (number <= 40) return ["History", "Indian History", "History and Culture", "Easy"];
  if (number <= 60) return ["Geography", "Indian Geography", "Physical and Indian Geography", "Easy"];
  if (number <= 80) return ["General Science", "General Science", "Science and Technology", "Easy"];
  if (number <= 90) return ["Indian Economy", "Indian Economy", "Economy", "Easy"];
  return ["GK / GS", "General Knowledge", "Current Affairs and General Knowledge", "Easy"];
}

function mapBankQuestion(question, index) {
  const [subject, chapter, topic, level] = classifyBankQuestion(question, index);
  const isDataInterpretation = subject === "Data Interpretation";
  const isEconomy = subject === "Indian Economy";
  return {
    ...question,
    id: String(question.id ?? `gk-${index + 1}`),
    prompt: question.prompt ?? question.question ?? question.text ?? "",
    options: question.options ?? question.choices ?? [],
    correct: question.correct ?? question.answer,
    subjects: isDataInterpretation ? ["Quantitative Aptitude", subject] : [gk, subject],
    exams: isDataInterpretation || isEconomy
      ? ["SSC Exams", "Banking Exams", "RRB Exams"]
      : ["SSC Exams", "RRB Exams", "UPSC", "State PCS"],
    chapter: question.chapter ?? chapter,
    topic: question.topic ?? topic,
    level: question.level ?? level,
  };
}

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

export function mapQuestionBank(bank) {
  const bankQuestions = Array.isArray(bank?.questions) ? bank.questions : [];
  return [...bankQuestions.map(mapBankQuestion), ...samples];
}

export const questions = mapQuestionBank(questionBank);

export function findQuestions(filters, sourceQuestions = questions) {
  const { subject, exam, chapter, topic, level } = filters;
  return sourceQuestions.filter((question) =>
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
