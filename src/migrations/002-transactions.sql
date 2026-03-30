-- Migration: Create transactions table (append-only ledger)
-- Feature: 006-credit-billing

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('topup', 'charge', 'payout', 'commission', 'refund')),
  builder_id UUID NOT NULL REFERENCES builders(id),
  tester_id UUID REFERENCES testers(id),
  test_case_id UUID REFERENCES test_cases(id),
  credit_amount INTEGER NOT NULL,
  currency_amount_cents INTEGER NOT NULL,
  commission_pct NUMERIC(5,2),
  commission_amount_cents INTEGER,
  description TEXT NOT NULL,
  stripe_session_id TEXT,
  reference_id UUID,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique indexes for idempotency
CREATE UNIQUE INDEX idx_transactions_stripe_session
  ON transactions (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

CREATE UNIQUE INDEX idx_transactions_idempotency_key
  ON transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Query pattern indexes
CREATE INDEX idx_transactions_builder_created
  ON transactions (builder_id, created_at DESC);

CREATE INDEX idx_transactions_builder_type_created
  ON transactions (builder_id, type, created_at DESC);

CREATE INDEX idx_transactions_reference
  ON transactions (reference_id) WHERE reference_id IS NOT NULL;

CREATE INDEX idx_transactions_tester_payout
  ON transactions (tester_id, created_at DESC) WHERE type = 'payout';

-- Immutability trigger: reject UPDATE and DELETE
CREATE OR REPLACE FUNCTION prevent_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Transactions are immutable. Use compensating entries (refunds) instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_immutable_update
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_transaction_mutation();

CREATE TRIGGER transactions_immutable_delete
  BEFORE DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_transaction_mutation();

-- RLS: builders see only their own transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transactions_builder_policy ON transactions
  FOR SELECT
  USING (builder_id = current_setting('app.current_builder_id', true)::uuid);
