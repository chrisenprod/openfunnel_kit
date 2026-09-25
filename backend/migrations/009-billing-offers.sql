-- Preserve the credit allowance accepted at checkout, even if an admin edits the plan before payment.
CREATE TABLE billing_offers (
  environment TEXT NOT NULL, checkout_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  product_id TEXT NOT NULL, credits INTEGER NOT NULL CHECK(credits > 0), created_at TEXT NOT NULL,
  PRIMARY KEY(environment,checkout_id)
);
