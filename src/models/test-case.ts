import sql, { type SqlClient } from '../lib/db.js';

export interface TestCase {
  id: string;
  short_id: string;
  builder_id: string;
  template_id: string | null;
  template_type: 'flow_test' | 'review_test';
  title: string;
  description: string | null;
  url: string | null;
  steps: Record<string, unknown>[];
  credentials: Record<string, unknown> | null;
  status: string;
  assigned_tester_id: string | null;
  assigned_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  expires_at: Date | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  required_skills: string[];
  environment: string | null;
  tags: string[];
  callback_url: string | null;
  expected_behavior: string | null;
  // Review test specific fields
  context: string | null;
  devices_to_check: string[];
  focus_areas: string[];
  ignore_areas: string | null;
  type: 'standard' | 'onboarding_assessment';
  assessment_config: Record<string, unknown> | null;
  status_history: Array<{ status: string; at: string; tester_id?: string }>;
  created_at: Date;
  updated_at: Date;
}

export const CANCELLABLE_STATUSES = ['queued', 'assigned'];

export const TestCaseModel = {
  async findById(id: string): Promise<TestCase | null> {
    const isShortId = id.startsWith('BA-');
    const [row] = isShortId
      ? await sql<TestCase[]>`SELECT * FROM test_cases WHERE short_id = ${id}`
      : await sql<TestCase[]>`SELECT * FROM test_cases WHERE id = ${id}`;
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
    options: { status?: string; search?: string; page?: number; limit?: number; cursor?: string } = {},
  ): Promise<{ test_cases: TestCase[]; total: number; page: number; per_page: number; total_pages: number; next_cursor: string | null; has_more: boolean }> {
    const limit = Math.min(options.limit ?? 50, 500);
    const page = Math.max(options.page ?? 1, 1);
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [sql`builder_id = ${builderId}`];
    if (options.status) conditions.push(sql`status = ${options.status}`);
    if (options.search) conditions.push(sql`(title ILIKE ${'%' + options.search + '%'} OR description ILIKE ${'%' + options.search + '%'})`);
    if (options.cursor) conditions.push(sql`created_at < ${options.cursor}`);

    const where = conditions.reduce((a, b) => sql`${a} AND ${b}`);

    // Count total matching rows
    const [{ count }] = await sql<[{ count: number }]>`
      SELECT count(*)::int AS count FROM test_cases WHERE ${where}
    `;

    // Fetch page of rows
    const rows = await sql<TestCase[]>`
      SELECT * FROM test_cases
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const totalPages = Math.max(1, Math.ceil(count / limit));
    const hasMore = page < totalPages;
    const nextCursor = hasMore && rows.length > 0
      ? rows[rows.length - 1].created_at.toISOString()
      : null;

    return { test_cases: rows, total: count, page, per_page: limit, total_pages: totalPages, next_cursor: nextCursor, has_more: hasMore };
  },

  async create(data: {
    builder_id: string;
    title: string;
    template_type?: 'flow_test' | 'review_test';
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
    context?: string | null;
    devices_to_check?: string[];
    focus_areas?: string[];
    ignore_areas?: string | null;
    status_history?: Array<{ status: string; at: string }>;
  }): Promise<TestCase> {
    const statusHistory = data.status_history ?? [{ status: 'queued', at: new Date().toISOString() }];

    const [row] = await sql<TestCase[]>`
      INSERT INTO test_cases (
        builder_id, title, template_type, template_id, description, url,
        steps, credentials, external_id, metadata,
        required_skills, environment, tags, callback_url,
        expected_behavior, context, devices_to_check, focus_areas, ignore_areas,
        status_history
      ) VALUES (
        ${data.builder_id}, ${data.title}, ${data.template_type ?? 'flow_test'},
        ${data.template_id ?? null},
        ${data.description ?? null}, ${data.url ?? null},
        ${sql.json(data.steps as never)}, ${data.credentials ? sql.json(data.credentials as never) : null},
        ${data.external_id ?? null}, ${sql.json((data.metadata ?? {}) as never)},
        ${sql.json((data.required_skills ?? []) as never)}, ${data.environment ?? null},
        ${sql.json((data.tags ?? []) as never)}, ${data.callback_url ?? null},
        ${data.expected_behavior ?? null}, ${data.context ?? null},
        ${sql.json((data.devices_to_check ?? []) as never)},
        ${sql.json((data.focus_areas ?? []) as never)},
        ${data.ignore_areas ?? null},
        ${sql.json(statusHistory as never)}
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
