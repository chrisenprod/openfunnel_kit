CREATE TABLE agent_documents (
  id TEXT PRIMARY KEY,
  ai_agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  original BLOB NOT NULL,
  extracted_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('processing','ready','error')),
  error TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX agent_documents_agent ON agent_documents(ai_agent_id);
INSERT INTO agent_documents
  SELECT lower(hex(randomblob(16))), id, 'contexto-inicial.txt', 'text/plain',
    length(CAST(business_context AS BLOB)), CAST(business_context AS BLOB),
    business_context, 'ready', NULL, 1, updated_at, updated_at
  FROM ai_agents WHERE length(trim(coalesce(business_context,''))) > 0;
