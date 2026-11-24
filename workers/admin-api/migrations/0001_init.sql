CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','published','rejected')),
  question_type TEXT NOT NULL,
  subject TEXT,
  exam TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_subject_exam ON questions(subject, exam);
