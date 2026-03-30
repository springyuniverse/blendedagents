-- 002: API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id  UUID NOT NULL REFERENCES builders(id),
  key_hash    CHAR(64) NOT NULL UNIQUE,
  key_prefix  VARCHAR(12) NOT NULL,
  label       TEXT NULL,
  revoked_at  TIMESTAMPTZ NULL,
  last_used_at TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_builder_id ON api_keys (builder_id);
