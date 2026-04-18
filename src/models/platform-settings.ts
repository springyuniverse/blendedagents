import sql from '../lib/db.js';

export interface AdminNotifications {
  new_builder: boolean;
  new_tester: boolean;
  test_case_submitted: boolean;
  test_case_completed: boolean;
  tweet_reward_submitted: boolean;
  payout_processed: boolean;
}

export interface PlatformSettings {
  default_max_invites: number;
  require_invite_code: boolean;
  admin_notify_emails: string[];
  admin_notifications: AdminNotifications;
  updated_at: Date;
}

export const PlatformSettingsModel = {
  async get(): Promise<PlatformSettings> {
    const [row] = await sql<PlatformSettings[]>`
      SELECT default_max_invites, require_invite_code, admin_notify_emails, admin_notifications, updated_at
      FROM platform_settings WHERE id = 1
    `;
    return row;
  },

  async update(data: Record<string, unknown>): Promise<PlatformSettings> {
    const [row] = await sql<PlatformSettings[]>`
      UPDATE platform_settings SET ${sql(data)}
      WHERE id = 1
      RETURNING default_max_invites, require_invite_code, admin_notify_emails, admin_notifications, updated_at
    `;
    return row;
  },
};
