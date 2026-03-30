-- 008: Transactions table (immutable ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  TEXT NOT NULL CHECK (type IN ('topup', 'charge', 'payout', 'commission', 'refund')),
  builder_id            UUID NOT NULL REFERENCES builders(id),
  tester_id             UUID NULL REFERENCES testers(id),
  test_case_id          UUID NULL REFERENCES test_cases(id),
  credit_amount         INTEGER NOT NULL,
  currency_amount_cents INTEGER NOT NULL,
  commission_pct        NUMERIC(5,2) NULL,
  commission_amount_cents INTEGER NULL,
  description           TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutability trigger: reject UPDATE and DELETE
CREATE OR REPLACE FUNCTION reject_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'transactions table is immutable: % not allowed', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transactions_immutable
  BEFORE UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION reject_transaction_mutation();

CREATE INDEX idx_transactions_builder_created ON transactions (builder_id, created_at DESC);
CREATE INDEX idx_transactions_tester_created ON transactions (tester_id, created_at DESC);
