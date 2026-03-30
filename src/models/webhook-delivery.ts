import sql from '../lib/db.js';

export interface WebhookDelivery {
  id: string;
  builder_id: string;
  test_case_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  url: string;
  response_status: number | null;
  response_body: string | null;
  attempt_count: number;
  next_retry_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
}

export const WebhookDeliveryModel = {
  async create(data: {
    builder_id: string;
    test_case_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    url: string;
  }): Promise<WebhookDelivery> {
    const [row] = await sql<WebhookDelivery[]>`
      INSERT INTO webhook_deliveries (
        builder_id, test_case_id, event_type, payload, url
      ) VALUES (
        ${data.builder_id}, ${data.test_case_id}, ${data.event_type},
        ${sql.json(data.payload as never)}, ${data.url}
      )
      RETURNING *
    `;
    return row;
  },

  async listByBuilder(builderId: string, limit = 20): Promise<WebhookDelivery[]> {
    return sql<WebhookDelivery[]>`
      SELECT * FROM webhook_deliveries
      WHERE builder_id = ${builderId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  },

  async updateAttempt(
    id: string,
    data: {
      response_status: number;
      response_body: string | null;
      attempt_count: number;
      next_retry_at?: Date | null;
      delivered_at?: Date | null;
    },
  ): Promise<WebhookDelivery> {
    const [row] = await sql<WebhookDelivery[]>`
      UPDATE webhook_deliveries SET
        response_status = ${data.response_status},
        response_body = ${data.response_body},
        attempt_count = ${data.attempt_count},
        next_retry_at = ${data.next_retry_at ?? null},
        delivered_at = ${data.delivered_at ?? null}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) throw new Error(`WebhookDelivery ${id} not found`);
    return row;
  },
};
