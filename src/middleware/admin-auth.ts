import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';

interface AdminRecord {
  id: string;
  email: string;
  display_name: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    admin: AdminRecord | null;
  }
}

export async function adminAuthPlugin(app: FastifyInstance) {
  if (!app.hasRequestDecorator('admin')) {
    app.decorateRequest('admin', null);
  }

  app.addHook('preHandler', async (request: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    // Dev mode: check x-dev-role header
    const devRole = request.headers['x-dev-role'] as string | undefined;
    if (devRole === 'admin') {
      const [devAdmin] = await sql<AdminRecord[]>`SELECT id, email, display_name FROM admins LIMIT 1`;
      if (!devAdmin) throw Errors.forbidden('No admin accounts exist');
      request.admin = devAdmin;
      return;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw Errors.unauthorized('Invalid or expired token');
    }

    const email = (user.email || '').toLowerCase();

    // Check admins table
    const [admin] = await sql<AdminRecord[]>`
      SELECT id, email, display_name FROM admins WHERE lower(email) = ${email}
    `;

    if (!admin) {
      throw Errors.forbidden('Admin access required');
    }

    // Link auth_user_id if not yet linked
    if (!admin.id) {
      await sql`UPDATE admins SET auth_user_id = ${user.id} WHERE lower(email) = ${email} AND auth_user_id IS NULL`;
    }

    request.admin = admin;

    // Disable RLS restrictions for admin queries
    await sql`SELECT set_config('app.is_admin', 'true', true)`;
  });
}
