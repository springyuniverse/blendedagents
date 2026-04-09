import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentsMd = readFileSync(resolve(__dirname, '../../AGENTS.md'), 'utf-8');

export async function agentsRoutes(app: FastifyInstance) {
  app.get('/agents', async (_request, reply) => {
    reply.type('text/markdown; charset=utf-8').send(agentsMd);
  });
}
