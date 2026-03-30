-- Migration: Create credit_packs table
-- Feature: 006-credit-billing

CREATE TABLE IF NOT EXISTS credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credit_amount INTEGER NOT NULL CHECK (credit_amount > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stripe_price_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_credit_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_packs_updated_at
  BEFORE UPDATE ON credit_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_packs_updated_at();
