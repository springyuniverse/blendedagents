import sql from '../lib/db.js';

export interface StepResult {
  id: string;
  test_case_id: string;
  tester_id: string;
  step_index: number;
  status: string;
  severity: string | null;
  actual_behavior: string | null;
  screenshot_url: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export const StepResultModel = {
  async findByTestCase(testCaseId: string): Promise<StepResult[]> {
    return sql<StepResult[]>`
      SELECT * FROM step_results
      WHERE test_case_id = ${testCaseId}
      ORDER BY step_index ASC
    `;
  },

  async create(data: {
    test_case_id: string;
    tester_id: string;
    step_index: number;
    status: string;
    severity?: string | null;
    actual_behavior?: string | null;
    screenshot_url?: string | null;
    notes?: string | null;
  }): Promise<StepResult> {
    const [row] = await sql<StepResult[]>`
      INSERT INTO step_results (
        test_case_id, tester_id, step_index, status,
        severity, actual_behavior, screenshot_url, notes
      ) VALUES (
        ${data.test_case_id}, ${data.tester_id}, ${data.step_index}, ${data.status},
        ${data.severity ?? null}, ${data.actual_behavior ?? null},
        ${data.screenshot_url ?? null}, ${data.notes ?? null}
      )
      ON CONFLICT (test_case_id, step_index) DO UPDATE SET
        status = EXCLUDED.status,
        severity = EXCLUDED.severity,
        actual_behavior = EXCLUDED.actual_behavior,
        screenshot_url = EXCLUDED.screenshot_url,
        notes = EXCLUDED.notes
      RETURNING *
    `;
    return row;
  },

  async update(id: string, data: Partial<Pick<StepResult, 'status' | 'severity' | 'actual_behavior' | 'screenshot_url' | 'notes'>>): Promise<StepResult> {
    const [row] = await sql<StepResult[]>`
      UPDATE step_results SET ${sql(data as Record<string, unknown>)}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) throw new Error(`StepResult ${id} not found`);
    return row;
  },
};
