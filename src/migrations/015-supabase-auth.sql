-- Add Supabase auth user ID to builders and testers
ALTER TABLE builders ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
ALTER TABLE testers ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_builders_auth_user ON builders (auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_testers_auth_user ON testers (auth_user_id) WHERE auth_user_id IS NOT NULL;
