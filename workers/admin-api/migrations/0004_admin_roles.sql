CREATE TABLE IF NOT EXISTS admin_job_titles (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  hierarchy_level INTEGER NOT NULL,
  category TEXT NOT NULL
);

INSERT OR IGNORE INTO admin_job_titles (code,title,hierarchy_level,category) VALUES
('OWNER','Owner / Founder',0,'Ownership'),
('BOARD_CHAIR','Board Chairperson',1,'Board'),
('BOARD_DIRECTOR','Board Director',1,'Board'),
('CEO','Chief Executive Officer (CEO)',2,'Executive'),
('COO','Chief Operating Officer (COO)',2,'Executive'),
('CFO','Chief Financial Officer (CFO)',2,'Executive'),
('CTO','Chief Technology Officer (CTO)',2,'Executive'),
('CMO','Chief Marketing Officer (CMO)',2,'Executive'),
('CHRO','Chief Human Resources Officer (CHRO)',2,'Executive'),
('GC','General Counsel',2,'Executive'),
('EVP','Executive Vice President (EVP)',3,'Vice President'),
('SVP','Senior Vice President (SVP)',3,'Vice President'),
('VP','Vice President (VP)',3,'Vice President'),
('SENIOR_DIRECTOR','Senior Director',4,'Director'),
('DIRECTOR','Director',4,'Director'),
('ASSOC_DIRECTOR','Associate Director',4,'Director'),
('SENIOR_MANAGER','Senior Manager',5,'Management'),
('MANAGER','Manager',5,'Management'),
('ASSISTANT_MANAGER','Assistant Manager',5,'Management'),
('TEAM_LEAD','Team Lead',6,'Supervisory'),
('SUPERVISOR','Supervisor',6,'Supervisory'),
('SECTION_OFFICER','Section Officer',6,'Supervisory'),
('SENIOR_SPECIALIST','Senior Specialist',7,'Individual Contributor'),
('SENIOR_ANALYST','Senior Analyst',7,'Individual Contributor'),
('SENIOR_ENGINEER','Senior Engineer',7,'Individual Contributor'),
('SPECIALIST','Specialist',8,'Individual Contributor'),
('ANALYST','Analyst',8,'Individual Contributor'),
('ENGINEER','Engineer',8,'Individual Contributor'),
('EXECUTIVE','Executive',8,'Individual Contributor'),
('ASSOCIATE','Associate',8,'Individual Contributor'),
('JUNIOR_ASSOCIATE','Junior Associate',9,'Entry Level'),
('JUNIOR_EXECUTIVE','Junior Executive',9,'Entry Level'),
('ASSISTANT','Assistant',9,'Entry Level'),
('TRAINEE','Trainee',10,'Entry Level'),
('INTERN','Intern',10,'Entry Level'),
('OPERATIONS_SUPPORT','Operations Support Staff',10,'Support'),
('CLERICAL_SUPPORT','Clerical Support Staff',10,'Support'),
('FIELD_SUPPORT','Field Support Staff',10,'Support');

CREATE TABLE IF NOT EXISTS admin_access_roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  hierarchy_rank INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES admin_access_roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES admin_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  job_title_code TEXT NOT NULL REFERENCES admin_job_titles(code),
  department TEXT NOT NULL DEFAULT 'General',
  reports_to TEXT REFERENCES admin_users(id),
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active,email);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES admin_access_roles(id),
  assigned_by TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  target_email TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor_time
  ON admin_audit_log(actor_email,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_time
  ON admin_audit_log(target_user_id,created_at DESC);

INSERT OR IGNORE INTO admin_permissions (code,description) VALUES
('admin.team.manage','Create, update, disable, and reset staff accounts'),
('question.read','View question bank content'),
('question.write','Create and edit question bank content'),
('question.review','Approve or reject question changes'),
('taxonomy.manage','Manage subject, chapter, and topic codes'),
('r2.read','View R2 upload history and stored content'),
('r2.upload','Upload and replace R2 content'),
('audit.read','View upload and question change audit history'),
('analytics.read','View business and usage analytics');

INSERT OR IGNORE INTO admin_access_roles (id,code,name,description,hierarchy_rank) VALUES
('role_content_admin','content_admin','Content Admin','Manage question content, taxonomy and review workflow',20),
('role_content_editor','content_editor','Content Editor','Create and edit question content',40),
('role_reviewer','reviewer','Reviewer','Review and approve question changes',40),
('role_storage_manager','storage_manager','Storage Manager','Upload content and inspect storage history',50),
('role_analyst','analyst','Analyst','Read analytics and question bank metadata',60),
('role_read_only','read_only','Read Only','View permitted admin content without editing',90);

INSERT OR IGNORE INTO admin_role_permissions (role_id,permission_code) VALUES
('role_content_admin','question.read'),
('role_content_admin','question.write'),
('role_content_admin','question.review'),
('role_content_admin','taxonomy.manage'),
('role_content_admin','r2.read'),
('role_content_admin','r2.upload'),
('role_content_admin','audit.read'),
('role_content_editor','question.read'),
('role_content_editor','question.write'),
('role_content_editor','taxonomy.manage'),
('role_content_editor','r2.read'),
('role_reviewer','question.read'),
('role_reviewer','question.review'),
('role_storage_manager','r2.read'),
('role_storage_manager','r2.upload'),
('role_storage_manager','audit.read'),
('role_analyst','question.read'),
('role_analyst','analytics.read'),
('role_read_only','question.read'),
('role_read_only','r2.read');
