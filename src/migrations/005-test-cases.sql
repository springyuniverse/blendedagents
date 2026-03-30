-- 005: Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id         UUID NOT NULL REFERENCES builders(id),
  template_id        UUID NULL REFERENCES test_templates(id),
  title              TEXT NOT NULL,
  description        TEXT NULL,
  url                TEXT NULL,
  steps              JSONB NOT NULL DEFAULT '[]',
  credentials        JSONB NULL,
  status             TEXT NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued', 'assigned', 'in_progress', 'submitted', 'completed', 'expired', 'cancelled')),
  assigned_tester_id UUID NULL REFERENCES testers(id),
  assigned_at        TIMESTAMPTZ NULL,
  completed_at       TIMESTAMPTZ NULL,
  expires_at         TIMESTAMPTZ NULL,
  external_id        TEXT NULL,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_test_cases_updated_at
  BEFORE UPDATE ON test_cases
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_test_cases_builder_id ON test_cases (builder_id);
CREATE INDEX idx_test_cases_builder_status ON test_cases (builder_id, status);
CREATE INDEX idx_test_cases_active_status ON test_cases (status)
  WHERE status IN ('queued', 'assigned', 'in_progress');

-- Now that test_cases exists, add the deferred FK from testers
ALTER TABLE testers
  ADD CONSTRAINT fk_testers_current_task
  FOREIGN KEY (current_task_id) REFERENCES test_cases(id);
