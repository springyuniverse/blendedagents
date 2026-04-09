-- 016: Enforced templates — add template_type to test_cases, create findings table

-- Add template_type and review-test specific columns to test_cases
ALTER TABLE test_cases
  ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'flow_test'
    CHECK (template_type IN ('flow_test', 'review_test')),
  ADD COLUMN IF NOT EXISTS context TEXT NULL,
  ADD COLUMN IF NOT EXISTS devices_to_check JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS focus_areas JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ignore_areas TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_test_cases_template_type ON test_cases (template_type);

-- Findings table for review_test results
CREATE TABLE IF NOT EXISTS findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id    UUID NOT NULL REFERENCES test_cases(id),
  tester_id       UUID NOT NULL REFERENCES testers(id),
  severity        TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor')),
  category        TEXT NOT NULL CHECK (category IN ('functionality', 'layout', 'content', 'typography', 'forms', 'images')),
  description     TEXT NOT NULL,
  screenshot_url  TEXT NULL,
  device          TEXT NOT NULL,
  location        TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_findings_updated_at
  BEFORE UPDATE ON findings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_findings_test_case_id ON findings (test_case_id);
CREATE INDEX idx_findings_tester_id ON findings (tester_id);
