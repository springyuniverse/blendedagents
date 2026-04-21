-- 025: Add 'missing_info' to step_results status for tester-builder info requests at step level
ALTER TABLE step_results DROP CONSTRAINT IF EXISTS step_results_status_check;
ALTER TABLE step_results ADD CONSTRAINT step_results_status_check
  CHECK (status IN ('pending', 'passed', 'failed', 'blocked', 'skipped', 'missing_info'));
