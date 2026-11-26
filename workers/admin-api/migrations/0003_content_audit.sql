CREATE TABLE IF NOT EXISTS content_uploads (
  upload_id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  expected_size INTEGER NOT NULL,
  actual_size INTEGER,
  uploaded_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('uploading', 'completed', 'completed_with_issues', 'completed_unverified', 'aborted')),
  question_count INTEGER,
  added_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  removed_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  validation_issues_json TEXT NOT NULL DEFAULT '[]',
  schema_version TEXT,
  bank_version TEXT,
  sha256 TEXT,
  r2_etag TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_uploads_object_time
  ON content_uploads(object_key, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_uploads_actor_time
  ON content_uploads(uploaded_by, started_at DESC);

CREATE TABLE IF NOT EXISTS question_change_log (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  question_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'removed')),
  object_key TEXT NOT NULL,
  upload_id TEXT NOT NULL REFERENCES content_uploads(upload_id),
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_question_change_log_question_time
  ON question_change_log(question_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_change_log_upload
  ON question_change_log(upload_id);

CREATE TABLE IF NOT EXISTS question_taxonomy_nodes (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('subject','chapter','topic')),
  parent_id TEXT REFERENCES question_taxonomy_nodes(id),
  code TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_hi TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  UNIQUE (kind, parent_id, code)
);
CREATE INDEX IF NOT EXISTS idx_question_taxonomy_parent
  ON question_taxonomy_nodes(parent_id, kind, is_active);

CREATE TABLE IF NOT EXISTS question_topic_sequences (
  topic_id TEXT PRIMARY KEY REFERENCES question_taxonomy_nodes(id),
  last_number INTEGER NOT NULL DEFAULT 0 CHECK (last_number BETWEEN 0 AND 999999),
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_question_taxonomy_subject_code
  ON question_taxonomy_nodes(code) WHERE kind='subject';
CREATE UNIQUE INDEX IF NOT EXISTS idx_question_taxonomy_child_name
  ON question_taxonomy_nodes(kind, parent_id, name_en) WHERE kind!='subject';
CREATE UNIQUE INDEX IF NOT EXISTS idx_question_taxonomy_subject_name
  ON question_taxonomy_nodes(name_en) WHERE kind='subject';
