-- Migration: Create credit_rate_config table
-- Feature: 006-credit-billing

CREATE TABLE IF NOT EXISTS credit_rate_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  per_credit_rate_cents INTEGER NOT NULL CHECK (per_credit_rate_cents > 0),
  effective_from TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES builders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_rate_effective
  ON credit_rate_config (effective_from DESC);
