-- 010: Row-Level Security policies for all tables

-- ============================================================
-- Enable RLS on every application table
-- ============================================================
ALTER TABLE builders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE builders           FORCE ROW LEVEL SECURITY;

ALTER TABLE api_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys           FORCE ROW LEVEL SECURITY;

ALTER TABLE testers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE testers            FORCE ROW LEVEL SECURITY;

ALTER TABLE test_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_templates     FORCE ROW LEVEL SECURITY;

ALTER TABLE test_cases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases         FORCE ROW LEVEL SECURITY;

ALTER TABLE step_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_results       FORCE ROW LEVEL SECURITY;

ALTER TABLE test_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results       FORCE ROW LEVEL SECURITY;

ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       FORCE ROW LEVEL SECURITY;

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: current actor IDs from session settings
-- ============================================================
-- Usage: SET LOCAL app.current_builder_id = '<uuid>';
--        SET LOCAL app.current_tester_id  = '<uuid>';

-- ============================================================
-- builders: own row only
-- ============================================================
CREATE POLICY builders_select ON builders
  FOR SELECT USING (id = current_setting('app.current_builder_id', true)::uuid);

CREATE POLICY builders_update ON builders
  FOR UPDATE USING (id = current_setting('app.current_builder_id', true)::uuid);

-- ============================================================
-- api_keys: builder sees own keys
-- ============================================================
CREATE POLICY api_keys_select ON api_keys
  FOR SELECT USING (builder_id = current_setting('app.current_builder_id', true)::uuid);

-- ============================================================
-- testers: own row only
-- ============================================================
CREATE POLICY testers_select ON testers
  FOR SELECT USING (id = current_setting('app.current_tester_id', true)::uuid);

CREATE POLICY testers_update ON testers
  FOR UPDATE USING (id = current_setting('app.current_tester_id', true)::uuid);

-- ============================================================
-- test_templates: builder CRUD on own templates
-- ============================================================
CREATE POLICY test_templates_builder_select ON test_templates
  FOR SELECT USING (builder_id = current_setting('app.current_builder_id', true)::uuid);

CREATE POLICY test_templates_builder_insert ON test_templates
  FOR INSERT WITH CHECK (builder_id = current_setting('app.current_builder_id', true)::uuid);

CREATE POLICY test_templates_builder_update ON test_templates
  FOR UPDATE USING (builder_id = current_setting('app.current_builder_id', true)::uuid);

CREATE POLICY test_templates_builder_delete ON test_templates
  FOR DELETE USING (builder_id = current_setting('app.current_builder_id', true)::uuid);

-- ============================================================
-- test_cases: builder CRUD; tester SELECT on assigned
-- ============================================================
CREATE POLICY test_cases_builder_select ON test_cases
  FOR SELECT USING (builder_id = current_setting('app.current_builder_id', true)::uuid);

CREATE POLICY test_cases_builder_insert ON test_cases
  FOR INSERT WITH CHECK (builder_id = current_setting('app.current_builder_id', true)::uuid);

CREATE POLICY test_cases_builder_update ON test_cases
  FOR UPDATE USING (builder_id = current_setting('app.current_builder_id', true)::uuid);

CREATE POLICY test_cases_builder_delete ON test_cases
  FOR DELETE USING (builder_id = current_setting('app.current_builder_id', true)::uuid);

CREATE POLICY test_cases_tester_select ON test_cases
  FOR SELECT USING (assigned_tester_id = current_setting('app.current_tester_id', true)::uuid);

-- ============================================================
-- step_results: builder SELECT via test case; tester SELECT/INSERT/UPDATE own
-- ============================================================
CREATE POLICY step_results_builder_select ON step_results
  FOR SELECT USING (
    test_case_id IN (
      SELECT id FROM test_cases
      WHERE builder_id = current_setting('app.current_builder_id', true)::uuid
    )
  );

CREATE POLICY step_results_tester_select ON step_results
  FOR SELECT USING (tester_id = current_setting('app.current_tester_id', true)::uuid);

CREATE POLICY step_results_tester_insert ON step_results
  FOR INSERT WITH CHECK (tester_id = current_setting('app.current_tester_id', true)::uuid);

CREATE POLICY step_results_tester_update ON step_results
  FOR UPDATE USING (tester_id = current_setting('app.current_tester_id', true)::uuid);

-- ============================================================
-- test_results: builder SELECT via test case; tester SELECT/INSERT own
-- ============================================================
CREATE POLICY test_results_builder_select ON test_results
  FOR SELECT USING (
    test_case_id IN (
      SELECT id FROM test_cases
      WHERE builder_id = current_setting('app.current_builder_id', true)::uuid
    )
  );

CREATE POLICY test_results_tester_select ON test_results
  FOR SELECT USING (tester_id = current_setting('app.current_tester_id', true)::uuid);

CREATE POLICY test_results_tester_insert ON test_results
  FOR INSERT WITH CHECK (tester_id = current_setting('app.current_tester_id', true)::uuid);

-- ============================================================
-- transactions: builder sees own; tester sees own payouts
-- ============================================================
CREATE POLICY transactions_builder_select ON transactions
  FOR SELECT USING (builder_id = current_setting('app.current_builder_id', true)::uuid);

CREATE POLICY transactions_tester_select ON transactions
  FOR SELECT USING (tester_id = current_setting('app.current_tester_id', true)::uuid);

-- ============================================================
-- webhook_deliveries: builder sees own
-- ============================================================
CREATE POLICY webhook_deliveries_builder_select ON webhook_deliveries
  FOR SELECT USING (builder_id = current_setting('app.current_builder_id', true)::uuid);
