import sql from '../lib/db.js';

export interface PlatformSettings {
  default_max_invites: number;
  require_invite_code: boolean;
  updated_at: Date;
}

export const PlatformSettingsModel = {
  async get(): Promise<PlatformSettings> {
    const [row] = await sql<PlatformSettings[]>`
      SELECT default_max_invites, require_invite_code, updated_at
      FROM platform_settings WHERE id = 1
    `;
    return row;
  },

  async update(data: Partial<Pick<PlatformSettings, 'default_max_invites' | 'require_invite_code'>>): Promise<PlatformSettings> {
    const [row] = await sql<PlatformSettings[]>`
      UPDATE platform_settings SET ${sql(data as Record<string, unknown>)}
      WHERE id = 1
      RETURNING default_max_invites, require_invite_code, updated_at
    `;
    return row;
  },
};
