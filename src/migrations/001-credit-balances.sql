-- Migration: Create credit_balances table
-- Feature: 006-credit-billing
-- Depends on: builders table from 001-foundation-auth

CREATE TABLE IF NOT EXISTS credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id UUID NOT NULL UNIQUE REFERENCES builders(id) ON DELETE CASCADE,
  available_credits INTEGER NOT NULL DEFAULT 0 CHECK (available_credits >= 0),
  reserved_credits INTEGER NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION update_credit_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_balances_updated_at
  BEFORE UPDATE ON credit_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_balances_updated_at();

-- RLS: builders can only read their own balance
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_balances_builder_policy ON credit_balances
  FOR SELECT
  USING (builder_id = current_setting('app.current_builder_id', true)::uuid);
