CREATE TABLE provider_connections (
  provider TEXT PRIMARY KEY CHECK(provider IN ('zernio','llm')),
  version INTEGER NOT NULL,
  ciphertext TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE cloud_accounts (
  user_id TEXT PRIMARY KEY REFERENCES auth_user(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('client','superadmin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX cloud_single_owner ON cloud_accounts(role) WHERE role='superadmin';
CREATE TABLE cloud_mail_tokens (
  digest TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE cloud_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE cloud_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, subject_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL);
