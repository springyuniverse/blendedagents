import sql from '../lib/db.js';

export interface TesterInvite {
  id: string;
  inviter_id: string;
  code: string;
  used_by_id: string | null;
  used_at: Date | null;
  created_at: Date;
}

export const TesterInviteModel = {
  async findByCode(code: string): Promise<TesterInvite | null> {
    const [row] = await sql<TesterInvite[]>`
      SELECT * FROM tester_invites WHERE code = ${code}
    `;
    return row ?? null;
  },

  async findByInviter(inviterId: string): Promise<TesterInvite[]> {
    return sql<TesterInvite[]>`
      SELECT * FROM tester_invites WHERE inviter_id = ${inviterId}
      ORDER BY created_at DESC
    `;
  },

  async countByInviter(inviterId: string): Promise<number> {
    const [row] = await sql<{ count: string }[]>`
      SELECT count(*)::text FROM tester_invites WHERE inviter_id = ${inviterId}
    `;
    return parseInt(row.count, 10);
  },

  async create(data: { inviter_id: string; code: string }): Promise<TesterInvite> {
    const [row] = await sql<TesterInvite[]>`
      INSERT INTO tester_invites (inviter_id, code)
      VALUES (${data.inviter_id}, ${data.code})
      RETURNING *
    `;
    return row;
  },

  async redeem(code: string, usedById: string): Promise<TesterInvite | null> {
    const [row] = await sql<TesterInvite[]>`
      UPDATE tester_invites
      SET used_by_id = ${usedById}, used_at = now()
      WHERE code = ${code} AND used_by_id IS NULL
      RETURNING *
    `;
    return row ?? null;
  },
};
