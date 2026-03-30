-- 006: Step results table
CREATE TABLE IF NOT EXISTS step_results (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id   UUID NOT NULL REFERENCES test_cases(id),
  tester_id      UUID NOT NULL REFERENCES testers(id),
  step_index     INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'passed', 'failed', 'blocked', 'skipped')),
  severity       TEXT NULL
                 CHECK (severity IN ('critical', 'major', 'minor', 'suggestion')),
  actual_behavior TEXT NULL,
  screenshot_url TEXT NULL,
  notes          TEXT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (test_case_id, step_index)
);

CREATE TRIGGER trg_step_results_updated_at
  BEFORE UPDATE ON step_results
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_step_results_test_case_id ON step_results (test_case_id);
