import sql from '../lib/db.js';

export interface TestCase {
  id: string;
  builder_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  url: string | null;
  steps: Record<string, unknown>[];
  credentials: Record<string, unknown> | null;
  status: string;
  assigned_tester_id: string | null;
  assigned_at: Date | null;
  completed_at: Date | null;
  expires_at: Date | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export const TestCaseModel = {
  async findById(id: string): Promise<TestCase | null> {
    const [row] = await sql<TestCase[]>`SELECT * FROM test_cases WHERE id = ${id}`;
    return row ?? null;
  },

  async listByBuilder(
    builderId: string,
    options: { status?: string; limit?: number; offset?: number } = {},
  ): Promise<TestCase[]> {
    const limit = Math.min(options.limit ?? 20, 100);
    const offset = options.offset ?? 0;

    if (options.status) {
      return sql<TestCase[]>`
        SELECT * FROM test_cases
        WHERE builder_id = ${builderId}
          AND status = ${options.status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return sql<TestCase[]>`
      SELECT * FROM test_cases
      WHERE builder_id = ${builderId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  },

  async create(data: {
    builder_id: string;
    title: string;
    template_id?: string | null;
    description?: string | null;
    url?: string | null;
    steps: Record<string, unknown>[];
    credentials?: Record<string, unknown> | null;
    external_id?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<TestCase> {
    const [row] = await sql<TestCase[]>`
      INSERT INTO test_cases (
        builder_id, title, template_id, description, url,
        steps, credentials, external_id, metadata
      ) VALUES (
        ${data.builder_id}, ${data.title}, ${data.template_id ?? null},
        ${data.description ?? null}, ${data.url ?? null},
        ${sql.json(data.steps as never)}, ${data.credentials ? sql.json(data.credentials as never) : null},
        ${data.external_id ?? null}, ${sql.json((data.metadata ?? {}) as never)}
      )
      RETURNING *
    `;
    return row;
  },

  async updateStatus(id: string, status: string): Promise<TestCase> {
    const [row] = await sql<TestCase[]>`
      UPDATE test_cases SET status = ${status}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) throw new Error(`TestCase ${id} not found`);
    return row;
  },
};
