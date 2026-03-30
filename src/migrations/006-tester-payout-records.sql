-- Migration: Create tester_payout_records table
-- Feature: 006-credit-billing

CREATE TABLE IF NOT EXISTS tester_payout_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_id UUID NOT NULL REFERENCES testers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_earnings_cents INTEGER NOT NULL CHECK (total_earnings_cents >= 0),
  transaction_count INTEGER NOT NULL CHECK (transaction_count >= 0),
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'pending', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payout_records_tester_period
  ON tester_payout_records (tester_id, period_start DESC);

CREATE INDEX idx_payout_records_status
  ON tester_payout_records (status) WHERE status = 'unpaid';

CREATE OR REPLACE FUNCTION update_tester_payout_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tester_payout_records_updated_at
  BEFORE UPDATE ON tester_payout_records
  FOR EACH ROW
  EXECUTE FUNCTION update_tester_payout_records_updated_at();
