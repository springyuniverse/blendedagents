-- 001: Builders table
CREATE TABLE IF NOT EXISTS builders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  webhook_url TEXT NULL,
  webhook_secret TEXT NULL,
  credits_balance INTEGER NOT NULL DEFAULT 0 CHECK (credits_balance >= 0),
  plan_tier   TEXT NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'pro', 'team')),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_builders_updated_at
  BEFORE UPDATE ON builders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
