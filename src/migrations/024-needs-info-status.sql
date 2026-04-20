-- 024: Add 'needs_info' status and info_requests column for tester-builder communication
ALTER TABLE test_cases DROP CONSTRAINT IF EXISTS test_cases_status_check;
ALTER TABLE test_cases ADD CONSTRAINT test_cases_status_check
  CHECK (status IN ('queued', 'assigned', 'in_progress', 'submitted', 'completed', 'expired', 'cancelled', 'needs_info'));

-- Stores info request/response thread between tester and builder
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS info_requests JSONB NOT NULL DEFAULT '[]';
