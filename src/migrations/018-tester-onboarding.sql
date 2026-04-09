-- 018: Tester onboarding + active flags + device tracking
-- onboarded: tracks whether tester passed the sandbox assessment
-- is_active: admin-controlled gate for which testers can take tests (default false)
-- devices: what devices the tester can test on

ALTER TABLE testers ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE testers ADD COLUMN IF NOT EXISTS devices JSONB NOT NULL DEFAULT '[]';

-- New testers should start inactive until an admin activates them
ALTER TABLE testers ALTER COLUMN is_active SET DEFAULT false;

-- Backfill: only mark testers as onboarded if they have profile data (devices filled).
-- Testers without profile data must go through onboarding.
UPDATE testers SET onboarded = true WHERE devices != '[]'::jsonb;
