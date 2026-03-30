import sql from '../lib/db.js';

export interface Tester {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  skills: string[];
  languages: string[];
  region: string;
  is_active: boolean;
  is_available: boolean;
  current_task_id: string | null;
  tasks_total: number;
  tasks_completed: number;
  avg_completion_minutes: number;
  earnings_cents: number;
  timezone: string | null;
  created_at: Date;
  updated_at: Date;
}

export const TesterModel = {
  async findById(id: string): Promise<Tester | null> {
    const [row] = await sql<Tester[]>`SELECT * FROM testers WHERE id = ${id}`;
    return row ?? null;
  },

  async findByEmail(email: string): Promise<Tester | null> {
    const [row] = await sql<Tester[]>`SELECT * FROM testers WHERE email = ${email}`;
    return row ?? null;
  },

  async create(data: {
    display_name: string;
    email: string;
    region: string;
    avatar_url?: string | null;
    skills?: string[];
    languages?: string[];
    timezone?: string | null;
  }): Promise<Tester> {
    const [row] = await sql<Tester[]>`
      INSERT INTO testers (display_name, email, region, avatar_url, skills, languages, timezone)
      VALUES (
        ${data.display_name}, ${data.email}, ${data.region},
        ${data.avatar_url ?? null},
        ${sql.json((data.skills ?? []) as never)},
        ${sql.json((data.languages ?? []) as never)},
        ${data.timezone ?? null}
      )
      RETURNING *
    `;
    return row;
  },

  async update(id: string, data: Partial<Pick<Tester, 'display_name' | 'avatar_url' | 'skills' | 'languages' | 'region' | 'is_active' | 'is_available' | 'current_task_id' | 'timezone'>>): Promise<Tester> {
    const [row] = await sql<Tester[]>`
      UPDATE testers SET ${sql(data as Record<string, unknown>)}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) throw new Error(`Tester ${id} not found`);
    return row;
  },

  async checkIsActive(id: string): Promise<boolean> {
    const [row] = await sql<{ is_active: boolean }[]>`
      SELECT is_active FROM testers WHERE id = ${id}
    `;
    return row?.is_active ?? false;
  },
};
