CREATE TABLE billing_plans (
  environment TEXT NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL,
  amount INTEGER NOT NULL, currency TEXT NOT NULL, eligible INTEGER NOT NULL DEFAULT 0,
  credits INTEGER NOT NULL DEFAULT 0 CHECK(credits >= 0), published INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1, synced_at TEXT NOT NULL,
  PRIMARY KEY(environment, product_id)
);
CREATE TABLE billing_subscriptions (
  environment TEXT NOT NULL, id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  customer_id TEXT NOT NULL, product_id TEXT NOT NULL, status TEXT NOT NULL,
  period_start TEXT NOT NULL, period_end TEXT NOT NULL, cancel_at_period_end INTEGER NOT NULL,
  updated_at TEXT NOT NULL, PRIMARY KEY(environment, id)
);
CREATE INDEX billing_subscriptions_workspace ON billing_subscriptions(environment,workspace_id);
CREATE TABLE billing_periods (
  id TEXT PRIMARY KEY, environment TEXT NOT NULL, workspace_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL, order_id TEXT NOT NULL, product_id TEXT NOT NULL,
  starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, credits INTEGER NOT NULL CHECK(credits > 0),
  revoked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
  UNIQUE(environment,subscription_id,starts_at), UNIQUE(environment,order_id)
);
CREATE TABLE billing_operations (
  environment TEXT NOT NULL, workspace_id TEXT NOT NULL, operation_key TEXT NOT NULL,
  period_id TEXT NOT NULL REFERENCES billing_periods(id), kind TEXT NOT NULL CHECK(kind IN ('llm','tool')),
  source TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('reserved','consumed','released')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(environment,workspace_id,operation_key)
);
CREATE INDEX billing_operations_period ON billing_operations(period_id,status);
CREATE TABLE billing_events (
  environment TEXT NOT NULL, id TEXT NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT, received_at TEXT NOT NULL, available_at TEXT NOT NULL,
  PRIMARY KEY(environment,id)
);
CREATE TABLE billing_checkouts (
  environment TEXT NOT NULL, workspace_id TEXT NOT NULL, product_id TEXT NOT NULL,
  id TEXT NOT NULL, url TEXT NOT NULL, expires_at TEXT NOT NULL,
  PRIMARY KEY(environment,workspace_id)
);
