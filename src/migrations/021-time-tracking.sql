-- 021: Time tracking for task lifecycle
-- started_at: when tester clicks Start (assigned → in_progress)
-- duration_minutes: computed on completion (started_at → completed_at)

ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE test_results ADD COLUMN IF NOT EXISTS duration_minutes NUMERIC(7,2);
