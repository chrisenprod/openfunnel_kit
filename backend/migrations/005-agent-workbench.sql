ALTER TABLE ai_agents ADD COLUMN business_context TEXT;
ALTER TABLE prompts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE prompt_versions (
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  active INTEGER NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (prompt_id, version)
);
INSERT INTO prompt_versions
  SELECT id, version, name, description, content, active, 'migration', updated_at FROM prompts;

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  secret_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT
);
