import sql from '../lib/db.js';

export interface TestResult {
  id: string;
  test_case_id: string;
  tester_id: string;
  verdict: string;
  summary: string | null;
  steps_passed: number;
  steps_failed: number;
  steps_blocked: number;
  steps_total: number;
  recording_url: string | null;
  annotations_url: string | null;
  duration_minutes: number | null;
  machine_summary: Record<string, unknown> | null;
  created_at: Date;
}

export const TestResultModel = {
  async findByTestCase(testCaseId: string): Promise<TestResult | null> {
    const [row] = await sql<TestResult[]>`
      SELECT * FROM test_results
      WHERE test_case_id = ${testCaseId}
    `;
    return row ?? null;
  },

  async create(data: {
    test_case_id: string;
    tester_id: string;
    verdict: string;
    summary?: string | null;
    steps_passed: number;
    steps_failed: number;
    steps_blocked: number;
    steps_total: number;
    recording_url?: string | null;
    annotations_url?: string | null;
  }): Promise<TestResult> {
    const [row] = await sql<TestResult[]>`
      INSERT INTO test_results (
        test_case_id, tester_id, verdict, summary,
        steps_passed, steps_failed, steps_blocked, steps_total,
        recording_url, annotations_url
      ) VALUES (
        ${data.test_case_id}, ${data.tester_id}, ${data.verdict}, ${data.summary ?? null},
        ${data.steps_passed}, ${data.steps_failed}, ${data.steps_blocked}, ${data.steps_total},
        ${data.recording_url ?? null}, ${data.annotations_url ?? null}
      )
      RETURNING *
    `;
    return row;
  },
};
