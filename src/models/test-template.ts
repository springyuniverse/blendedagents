import sql from '../lib/db.js';

export interface TestTemplate {
  id: string;
  builder_id: string;
  title: string;
  description: string | null;
  steps: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  environment: string | null;
  tags: string[];
  expected_behavior: string | null;
  created_at: Date;
  updated_at: Date;
}

export const TestTemplateModel = {
  async findById(id: string): Promise<TestTemplate | null> {
    const [row] = await sql<TestTemplate[]>`SELECT * FROM test_templates WHERE id = ${id}`;
    return row ?? null;
  },

  async listByBuilder(builderId: string): Promise<TestTemplate[]> {
    return sql<TestTemplate[]>`
      SELECT * FROM test_templates
      WHERE builder_id = ${builderId}
      ORDER BY created_at DESC
    `;
  },

  async create(data: {
    builder_id: string;
    title: string;
    description?: string | null;
    steps: Record<string, unknown>[];
    metadata?: Record<string, unknown>;
    environment?: string | null;
    tags?: string[];
    expected_behavior?: string | null;
  }): Promise<TestTemplate> {
    const [row] = await sql<TestTemplate[]>`
      INSERT INTO test_templates (builder_id, title, description, steps, metadata, environment, tags, expected_behavior)
      VALUES (
        ${data.builder_id}, ${data.title}, ${data.description ?? null},
        ${sql.json(data.steps as never)}, ${sql.json((data.metadata ?? {}) as never)},
        ${data.environment ?? null}, ${sql.json((data.tags ?? []) as never)},
        ${data.expected_behavior ?? null}
      )
      RETURNING *
    `;
    return row;
  },

  async update(id: string, data: Partial<Pick<TestTemplate, 'title' | 'description' | 'steps' | 'metadata'>>): Promise<TestTemplate> {
    const [row] = await sql<TestTemplate[]>`
      UPDATE test_templates SET ${sql(data as Record<string, unknown>)}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) throw new Error(`TestTemplate ${id} not found`);
    return row;
  },

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM test_templates WHERE id = ${id}`;
  },
};
