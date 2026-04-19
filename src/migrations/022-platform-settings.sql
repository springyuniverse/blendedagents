-- 022: Platform-wide settings (single-row config table)
CREATE TABLE IF NOT EXISTS platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_max_invites INTEGER NOT NULL DEFAULT 0,
  require_invite_code BOOLEAN NOT NULL DEFAULT true,
  admin_notify_emails TEXT[] NOT NULL DEFAULT '{}',
  admin_notifications JSONB NOT NULL DEFAULT '{"new_builder": true, "new_tester": true, "test_case_submitted": true, "test_case_completed": true, "tweet_reward_submitted": true, "payout_processed": true}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure exactly one row exists
INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Auto-update timestamp
CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
