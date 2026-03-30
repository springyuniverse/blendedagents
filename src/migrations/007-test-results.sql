-- 007: Test results table
CREATE TABLE IF NOT EXISTS test_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id    UUID NOT NULL UNIQUE REFERENCES test_cases(id),
  tester_id       UUID NOT NULL REFERENCES testers(id),
  verdict         TEXT NOT NULL CHECK (verdict IN ('pass', 'fail', 'partial', 'blocked')),
  summary         TEXT NULL,
  steps_passed    INTEGER NOT NULL DEFAULT 0,
  steps_failed    INTEGER NOT NULL DEFAULT 0,
  steps_blocked   INTEGER NOT NULL DEFAULT 0,
  steps_total     INTEGER NOT NULL DEFAULT 0,
  recording_url   TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
