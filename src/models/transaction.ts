import sql, { type SqlClient } from '../lib/db.js';

export type TransactionType = 'topup' | 'charge' | 'payout' | 'commission' | 'refund';

export const VALID_TRANSACTION_TYPES: TransactionType[] = [
  'topup', 'charge', 'payout', 'commission', 'refund',
];

export interface Transaction {
  id: string;
  type: TransactionType;
  builder_id: string;
  tester_id: string | null;
  test_case_id: string | null;
  credit_amount: number;
  currency_amount_cents: number;
  commission_pct: number | null;
  commission_amount_cents: number | null;
  description: string;
  stripe_session_id: string | null;
  reference_id: string | null;
  idempotency_key: string | null;
  created_at: Date;
}

export interface InsertTransaction {
  type: TransactionType;
  builder_id: string;
  tester_id?: string | null;
  test_case_id?: string | null;
  credit_amount: number;
  currency_amount_cents: number;
  commission_pct?: number | null;
  commission_amount_cents?: number | null;
  description: string;
  stripe_session_id?: string | null;
  reference_id?: string | null;
  idempotency_key?: string | null;
}

export interface TransactionPage {
  transactions: Transaction[];
  next_cursor: string | null;
  has_more: boolean;
}

export const TransactionModel = {
  async insert(data: InsertTransaction, tx?: SqlClient): Promise<Transaction> {
    const db = tx ?? sql;
    const [row] = await db<Transaction[]>`
      INSERT INTO transactions (
        type, builder_id, tester_id, test_case_id,
        credit_amount, currency_amount_cents,
        commission_pct, commission_amount_cents,
        description, stripe_session_id, reference_id, idempotency_key
      ) VALUES (
        ${data.type}, ${data.builder_id}, ${data.tester_id ?? null}, ${data.test_case_id ?? null},
        ${data.credit_amount}, ${data.currency_amount_cents},
        ${data.commission_pct ?? null}, ${data.commission_amount_cents ?? null},
        ${data.description}, ${data.stripe_session_id ?? null},
        ${data.reference_id ?? null}, ${data.idempotency_key ?? null}
      )
      RETURNING *
    `;
    return row;
  },

  async findByStripeSessionId(sessionId: string): Promise<Transaction | null> {
    const [row] = await sql<Transaction[]>`
      SELECT * FROM transactions WHERE stripe_session_id = ${sessionId}
    `;
    return row ?? null;
  },

  async listByBuilder(
    builderId: string,
    options: { type?: TransactionType; cursor?: string; limit?: number } = {},
  ): Promise<TransactionPage> {
    const limit = Math.min(options.limit ?? 20, 100);
    const fetchLimit = limit + 1; // Fetch one extra to determine has_more

    let rows: Transaction[];

    if (options.type && options.cursor) {
      rows = await sql<Transaction[]>`
        SELECT * FROM transactions
        WHERE builder_id = ${builderId}
          AND type = ${options.type}
          AND created_at < ${options.cursor}
        ORDER BY created_at DESC
        LIMIT ${fetchLimit}
      `;
    } else if (options.type) {
      rows = await sql<Transaction[]>`
        SELECT * FROM transactions
        WHERE builder_id = ${builderId}
          AND type = ${options.type}
        ORDER BY created_at DESC
        LIMIT ${fetchLimit}
      `;
    } else if (options.cursor) {
      rows = await sql<Transaction[]>`
        SELECT * FROM transactions
        WHERE builder_id = ${builderId}
          AND created_at < ${options.cursor}
        ORDER BY created_at DESC
        LIMIT ${fetchLimit}
      `;
    } else {
      rows = await sql<Transaction[]>`
        SELECT * FROM transactions
        WHERE builder_id = ${builderId}
        ORDER BY created_at DESC
        LIMIT ${fetchLimit}
      `;
    }

    const hasMore = rows.length > limit;
    const transactions = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && transactions.length > 0
      ? transactions[transactions.length - 1].created_at.toISOString()
      : null;

    return { transactions, next_cursor: nextCursor, has_more: hasMore };
  },
};
