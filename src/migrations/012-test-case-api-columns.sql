-- Migration: Add columns for 002-test-case-api
-- Feature: 002-test-case-api

-- Test cases: new fields for assignment, filtering, and audit
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS required_skills JSONB NOT NULL DEFAULT '[]';
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS environment TEXT;
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS callback_url TEXT;
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS expected_behavior TEXT;
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]';

-- Test templates: matching new fields
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS environment TEXT;
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS expected_behavior TEXT;

-- GIN indexes for filtering and assignment
CREATE INDEX IF NOT EXISTS idx_test_cases_tags ON test_cases USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_test_cases_required_skills ON test_cases USING GIN (required_skills);
