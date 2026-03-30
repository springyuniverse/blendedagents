-- Seed data for development and testing
-- Run AFTER all migrations have been applied.

-- ============================================================
-- Builders
-- ============================================================
INSERT INTO builders (id, display_name, email, credits_balance, plan_tier) VALUES
  ('a1b2c3d4-0000-4000-8000-000000000001', 'Alice Builder', 'alice@example.com', 500, 'pro'),
  ('a1b2c3d4-0000-4000-8000-000000000002', 'Bob Builder',   'bob@example.com',   100, 'starter')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- API keys
-- Placeholder SHA-256 hashes. In real usage the app hashes the
-- raw key before storing it.
--
-- Raw key for Alice: ba_live_alice000000000000000000000000000000000000
-- Raw key for Bob:   ba_live_bob0000000000000000000000000000000000000
-- ============================================================
INSERT INTO api_keys (id, builder_id, key_hash, key_prefix, label) VALUES
  (
    'b1b2c3d4-0000-4000-8000-000000000001',
    'a1b2c3d4-0000-4000-8000-000000000001',
    'a0a1a2a3a4a5a6a7a8a9b0b1b2b3b4b5b6b7b8b9c0c1c2c3c4c5c6c7c8c9d0d1',
    'ba_live_ali',
    'Alice dev key'
  ),
  (
    'b1b2c3d4-0000-4000-8000-000000000002',
    'a1b2c3d4-0000-4000-8000-000000000002',
    'e0e1e2e3e4e5e6e7e8e9f0f1f2f3f4f5f6f7f8f9a0a1a2a3a4a5a6a7a8a9b0b1',
    'ba_live_bob',
    'Bob dev key'
  )
ON CONFLICT (key_hash) DO NOTHING;

-- ============================================================
-- Testers (3 regions)
-- ============================================================
INSERT INTO testers (id, display_name, email, region, skills, languages, is_active, is_available, timezone) VALUES
  (
    'c1c2c3d4-0000-4000-8000-000000000001',
    'Fatma Tester',
    'fatma@example.com',
    'egypt',
    '["web", "mobile", "accessibility"]',
    '["ar", "en"]',
    true,
    true,
    'Africa/Cairo'
  ),
  (
    'c1c2c3d4-0000-4000-8000-000000000002',
    'Omar Tester',
    'omar@example.com',
    'mena',
    '["web", "api", "localization"]',
    '["ar", "fr", "en"]',
    true,
    true,
    'Asia/Riyadh'
  ),
  (
    'c1c2c3d4-0000-4000-8000-000000000003',
    'Linh Tester',
    'linh@example.com',
    'southeast_asia',
    '["mobile", "e-commerce", "payments"]',
    '["vi", "en"]',
    true,
    false,
    'Asia/Ho_Chi_Minh'
  )
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Test template (belongs to Alice)
-- ============================================================
INSERT INTO test_templates (id, builder_id, title, description, steps) VALUES
  (
    'd1d2d3d4-0000-4000-8000-000000000001',
    'a1b2c3d4-0000-4000-8000-000000000001',
    'Basic Login Flow',
    'Verify that a user can log in with valid credentials and is redirected to the dashboard.',
    '[
      {"index": 0, "instruction": "Navigate to the login page"},
      {"index": 1, "instruction": "Enter valid email and password"},
      {"index": 2, "instruction": "Click the Sign In button"},
      {"index": 3, "instruction": "Verify redirect to dashboard"},
      {"index": 4, "instruction": "Verify user name is displayed in the header"}
    ]'
  )
ON CONFLICT DO NOTHING;
