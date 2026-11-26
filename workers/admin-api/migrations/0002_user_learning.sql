CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  subject TEXT,
  exam TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  attempted_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  answers_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_completed
  ON test_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test
  ON test_attempts(test_id);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_question
  ON bookmarks(question_id);
