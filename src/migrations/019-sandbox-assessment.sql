-- 019: Assessment test cases
-- Adds type column to test_cases so onboarding assessments use the same
-- infrastructure as normal tasks but can be identified and auto-graded.

-- System builder used as the owner of assessment test cases
INSERT INTO builders (id, display_name, email, plan_tier)
VALUES ('00000000-0000-0000-0000-000000000000', 'BlendedAgents System', 'system@blendedagents.com', 'team')
ON CONFLICT (id) DO NOTHING;

-- Give the system builder a credit balance so assessment tasks don't fail
INSERT INTO credit_balances (builder_id, available_credits, reserved_credits)
VALUES ('00000000-0000-0000-0000-000000000000', 999999, 0)
ON CONFLICT (builder_id) DO NOTHING;

-- type: 'standard' (default) or 'onboarding_assessment'
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'standard';

-- assessment_config: planted issues, pass thresholds (only for assessment tasks)
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS assessment_config JSONB;
