-- 020: Tester invite/referral system
-- max_invites: admin-controlled limit on how many invite codes a tester can generate (default 0)
-- tester_invites: single-use invite codes that gate tester signup

-- Add max_invites to testers
ALTER TABLE testers ADD COLUMN IF NOT EXISTS max_invites INTEGER NOT NULL DEFAULT 0;

-- Invite codes table
CREATE TABLE IF NOT EXISTS tester_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id  UUID NOT NULL REFERENCES testers(id),
  code        TEXT NOT NULL UNIQUE,
  used_by_id  UUID REFERENCES testers(id),
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tester_invites_inviter ON tester_invites (inviter_id);
CREATE INDEX IF NOT EXISTS idx_tester_invites_used_by ON tester_invites (used_by_id) WHERE used_by_id IS NOT NULL;

-- RLS
ALTER TABLE tester_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tester_invites FORCE ROW LEVEL SECURITY;

-- Testers can view their own invites
CREATE POLICY tester_invites_select ON tester_invites
  FOR SELECT USING (
    inviter_id = current_setting('app.current_tester_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- Testers can create their own invites
CREATE POLICY tester_invites_insert ON tester_invites
  FOR INSERT WITH CHECK (
    inviter_id = current_setting('app.current_tester_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- Only the system (admin) can update invites (redeem)
CREATE POLICY tester_invites_update ON tester_invites
  FOR UPDATE USING (true);
