-- 013-machine-summary.sql
-- Add machine_summary JSONB column to test_results for storing
-- generated machine summaries with confidence scoring.
-- Part of 005-webhook-delivery feature.

ALTER TABLE test_results ADD COLUMN IF NOT EXISTS machine_summary JSONB;
