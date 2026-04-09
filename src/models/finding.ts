import sql from '../lib/db.js';

export interface Finding {
  id: string;
  test_case_id: string;
  tester_id: string;
  severity: 'critical' | 'major' | 'minor';
  category: 'functionality' | 'layout' | 'content' | 'typography' | 'forms' | 'images';
  description: string;
  screenshot_url: string | null;
  device: string;
  location: string;
  created_at: Date;
  updated_at: Date;
}

export const FindingModel = {
  async findByTestCase(testCaseId: string): Promise<Finding[]> {
    return sql<Finding[]>`
      SELECT * FROM findings
      WHERE test_case_id = ${testCaseId}
      ORDER BY created_at ASC
    `;
  },

  async create(data: {
    test_case_id: string;
    tester_id: string;
    severity: string;
    category: string;
    description: string;
    screenshot_url?: string | null;
    device: string;
    location: string;
  }): Promise<Finding> {
    const [row] = await sql<Finding[]>`
      INSERT INTO findings (
        test_case_id, tester_id, severity, category,
        description, screenshot_url, device, location
      ) VALUES (
        ${data.test_case_id}, ${data.tester_id}, ${data.severity}, ${data.category},
        ${data.description}, ${data.screenshot_url ?? null},
        ${data.device}, ${data.location}
      )
      RETURNING *
    `;
    return row;
  },

  async countByTestCase(testCaseId: string): Promise<{ critical: number; major: number; minor: number }> {
    const rows = await sql<{ severity: string; count: string }[]>`
      SELECT severity, COUNT(*)::text as count
      FROM findings
      WHERE test_case_id = ${testCaseId}
      GROUP BY severity
    `;
    const counts = { critical: 0, major: 0, minor: 0 };
    for (const row of rows) {
      counts[row.severity as keyof typeof counts] = parseInt(row.count, 10);
    }
    return counts;
  },
};
