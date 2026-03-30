-- 004: Test templates table
CREATE TABLE IF NOT EXISTS test_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id  UUID NOT NULL REFERENCES builders(id),
  title       TEXT NOT NULL,
  description TEXT NULL,
  steps       JSONB NOT NULL DEFAULT '[]',
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_test_templates_updated_at
  BEFORE UPDATE ON test_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_test_templates_builder_id ON test_templates (builder_id);
