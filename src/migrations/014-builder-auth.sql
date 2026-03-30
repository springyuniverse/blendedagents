-- 014: Builder authentication columns
ALTER TABLE builders ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE builders ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE builders ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;
ALTER TABLE builders ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE builders ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

CREATE INDEX IF NOT EXISTS idx_builders_email ON builders (email);
CREATE INDEX IF NOT EXISTS idx_builders_reset_token ON builders (password_reset_token) WHERE password_reset_token IS NOT NULL;
