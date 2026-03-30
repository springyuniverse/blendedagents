import type { FastifyInstance } from 'fastify';
import sql from '../lib/db.js';

const startTime = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    let dbStatus = 'connected';

    try {
      await sql`SELECT 1`;
    } catch {
      dbStatus = 'disconnected';
    }

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const status = dbStatus === 'connected' ? 'ok' : 'error';
    const statusCode = status === 'ok' ? 200 : 503;

    reply.status(statusCode).send({
      status,
      database: dbStatus,
      uptime_seconds: uptimeSeconds,
    });
  });
}
