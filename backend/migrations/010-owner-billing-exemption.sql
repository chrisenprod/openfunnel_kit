CREATE TABLE billing_exempt_operations (
  environment TEXT NOT NULL, workspace_id TEXT NOT NULL, operation_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('llm','tool')), source TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('reserved','consumed','released')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(environment,workspace_id,operation_key)
);
