import { PgBoss } from 'pg-boss';

let boss: PgBoss | null = null;

export async function getJobManager(): Promise<PgBoss> {
  if (boss) return boss;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for job manager');
  }

  boss = new PgBoss(databaseUrl);
  await boss.start();
  return boss;
}

export async function stopJobManager(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
