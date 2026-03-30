import type { FastifyInstance, FastifyRequest } from 'fastify';
import { TesterModel, type Tester } from '../models/tester.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';

declare module 'fastify' {
  interface FastifyRequest {
    tester: Tester | null;
  }
}

export async function testerAuthPlugin(app: FastifyInstance) {
  app.decorateRequest('tester', null);

  app.addHook('preHandler', async (request: FastifyRequest) => {
    const session = (request as unknown as { session?: { testerId?: string } }).session;
    const testerId = session?.testerId;

    if (!testerId) {
      throw Errors.unauthorized('Not authenticated');
    }

    // Verify tester is still active on every request
    const isActive = await TesterModel.checkIsActive(testerId);
    if (!isActive) {
      throw Errors.unauthorized('Account has been deactivated');
    }

    const tester = await TesterModel.findById(testerId);
    if (!tester) {
      throw Errors.unauthorized('Tester not found');
    }

    request.tester = tester;

    // Set RLS context for tester
    await sql`SELECT set_config('app.current_tester_id', ${testerId}, true)`;
  });
}
