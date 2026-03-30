-- Migration: Create regional_rates table
-- Feature: 006-credit-billing

CREATE TABLE IF NOT EXISTS regional_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL UNIQUE,
  base_pay_cents INTEGER NOT NULL,
  per_step_rate_cents INTEGER NOT NULL CHECK (per_step_rate_cents > 0),
  min_base_cents INTEGER NOT NULL,
  max_base_cents INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (base_pay_cents >= min_base_cents AND base_pay_cents <= max_base_cents),
  CHECK (min_base_cents > 0),
  CHECK (max_base_cents >= min_base_cents)
);

CREATE OR REPLACE FUNCTION update_regional_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER regional_rates_updated_at
  BEFORE UPDATE ON regional_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_regional_rates_updated_at();
