import sql, { type SqlClient } from '../lib/db.js';

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
  required_skills: string[];
  environment: string | null;
  tags: string[];
  callback_url: string | null;
  expected_behavior: string | null;
  status_history: Array<{ status: string; at: string; tester_id?: string }>;
  created_at: Date;
  updated_at: Date;
}

export const CANCELLABLE_STATUSES = ['queued', 'assigned'];

export const TestCaseModel = {
  async findById(id: string): Promise<TestCase | null> {
    const [row] = await sql<TestCase[]>`SELECT * FROM test_cases WHERE id = ${id}`;
    return row ?? null;
  },

  async getForUpdate(id: string, tx: SqlClient): Promise<TestCase | null> {
    const [row] = await tx<TestCase[]>`
      SELECT * FROM test_cases WHERE id = ${id} FOR UPDATE
    `;
    return row ?? null;
  },

  async listByBuilder(
    builderId: string,
    options: { status?: string; cursor?: string; limit?: number } = {},
  ): Promise<{ test_cases: TestCase[]; next_cursor: string | null; has_more: boolean }> {
    const limit = Math.min(options.limit ?? 20, 100);
    const fetchLimit = limit + 1;

    let rows: TestCase[];

    if (options.status && options.cursor) {
      rows = await sql<TestCase[]>`
        SELECT * FROM test_cases
        WHERE builder_id = ${builderId}
          AND status = ${options.status}
          AND created_at < ${options.cursor}
        ORDER BY created_at DESC
        LIMIT ${fetchLimit}
      `;
    } else if (options.status) {
      rows = await sql<TestCase[]>`
        SELECT * FROM test_cases
        WHERE builder_id = ${builderId}
          AND status = ${options.status}
        ORDER BY created_at DESC
        LIMIT ${fetchLimit}
      `;
    } else if (options.cursor) {
      rows = await sql<TestCase[]>`
        SELECT * FROM test_cases
        WHERE builder_id = ${builderId}
          AND created_at < ${options.cursor}
        ORDER BY created_at DESC
        LIMIT ${fetchLimit}
      `;
    } else {
      rows = await sql<TestCase[]>`
        SELECT * FROM test_cases
        WHERE builder_id = ${builderId}
        ORDER BY created_at DESC
        LIMIT ${fetchLimit}
      `;
    }

    const hasMore = rows.length > limit;
    const testCases = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && testCases.length > 0
      ? testCases[testCases.length - 1].created_at.toISOString()
      : null;

    return { test_cases: testCases, next_cursor: nextCursor, has_more: hasMore };
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
    required_skills?: string[];
    environment?: string | null;
    tags?: string[];
    callback_url?: string | null;
    expected_behavior?: string | null;
    status_history?: Array<{ status: string; at: string }>;
  }): Promise<TestCase> {
    const statusHistory = data.status_history ?? [{ status: 'queued', at: new Date().toISOString() }];

    const [row] = await sql<TestCase[]>`
      INSERT INTO test_cases (
        builder_id, title, template_id, description, url,
        steps, credentials, external_id, metadata,
        required_skills, environment, tags, callback_url,
        expected_behavior, status_history
      ) VALUES (
        ${data.builder_id}, ${data.title}, ${data.template_id ?? null},
        ${data.description ?? null}, ${data.url ?? null},
        ${sql.json(data.steps as never)}, ${data.credentials ? sql.json(data.credentials as never) : null},
        ${data.external_id ?? null}, ${sql.json((data.metadata ?? {}) as never)},
        ${sql.json((data.required_skills ?? []) as never)}, ${data.environment ?? null},
        ${sql.json((data.tags ?? []) as never)}, ${data.callback_url ?? null},
        ${data.expected_behavior ?? null}, ${sql.json(statusHistory as never)}
      )
      RETURNING *
    `;
    return row;
  },

  async updateStatus(id: string, status: string, extra?: Record<string, unknown>): Promise<TestCase> {
    // Append to status_history
    const historyEntry = JSON.stringify({ status, at: new Date().toISOString(), ...extra });

    const [row] = await sql<TestCase[]>`
      UPDATE test_cases
      SET status = ${status},
          status_history = status_history || ${historyEntry}::jsonb
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) throw new Error(`TestCase ${id} not found`);
    return row;
  },

  async cancelIfAllowed(id: string, tx: SqlClient): Promise<TestCase | null> {
    const [row] = await tx<TestCase[]>`
      UPDATE test_cases
      SET status = 'cancelled',
          status_history = status_history || ${JSON.stringify({ status: 'cancelled', at: new Date().toISOString() })}::jsonb
      WHERE id = ${id}
        AND status IN ('queued', 'assigned')
      RETURNING *
    `;
    return row ?? null;
  },
};
