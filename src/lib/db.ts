import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? '';

const sql = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SqlClient = any;

export default sql;
