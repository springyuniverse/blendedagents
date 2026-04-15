import type { FastifyInstance, FastifyRequest } from 'fastify';
import { adminAuthPlugin } from '../middleware/admin-auth.js';
import { AssignmentService } from '../services/assignment.service.js';
import { TesterModel } from '../models/tester.js';
import { PlatformSettingsModel } from '../models/platform-settings.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';
import { S3Service } from '../services/s3.service.js';
import { EmailService } from '../lib/email.js';
import { ASSESSMENT_CATALOG } from '../services/sandbox-scoring.service.js';

export async function adminRoutes(app: FastifyInstance) {
  await adminAuthPlugin(app);

  // GET /api/v1/admin/me — check if current user is admin
  app.get('/me', async (request) => {
    const admin = request.admin!;
    return { id: admin.id, email: admin.email, display_name: admin.display_name, role: 'admin' };
  });

  // GET /api/v1/admin/settings — platform settings
  app.get('/settings', async () => {
    return PlatformSettingsModel.get();
  });

  // PATCH /api/v1/admin/settings — update platform settings
  app.patch('/settings', async (request: FastifyRequest<{
    Body: { default_max_invites?: number; require_invite_code?: boolean };
  }>) => {
    const body = request.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (typeof body.default_max_invites === 'number') updates.default_max_invites = body.default_max_invites;
    if (typeof body.require_invite_code === 'boolean') updates.require_invite_code = body.require_invite_code;
    if (Object.keys(updates).length === 0) return PlatformSettingsModel.get();
    return PlatformSettingsModel.update(updates);
  });

  // GET /api/v1/admin/stats — platform overview KPIs
  app.get('/stats', async () => {
    const [[builderCount], [testerCount], statusCounts, [financials], [avgTime]] = await Promise.all([
      sql<{ count: string }[]>`SELECT count(*)::text FROM builders`,
      sql<{ count: string }[]>`SELECT count(*)::text FROM testers`,
      sql<{ status: string; count: string }[]>`
        SELECT status, count(*)::text FROM test_cases WHERE type = 'standard' GROUP BY status
      `,
      sql<{ total_topups: string; total_commissions: string; total_payouts: string; total_charges: string }[]>`
        SELECT
          coalesce(sum(CASE WHEN type = 'topup' THEN currency_amount_cents END), 0)::text AS total_topups,
          coalesce(sum(CASE WHEN type = 'commission' THEN currency_amount_cents END), 0)::text AS total_commissions,
          coalesce(sum(CASE WHEN type = 'payout' THEN currency_amount_cents END), 0)::text AS total_payouts,
          coalesce(sum(CASE WHEN type = 'charge' THEN currency_amount_cents END), 0)::text AS total_charges
        FROM transactions
      `,
      sql<{ avg: string }[]>`
        SELECT COALESCE(AVG(duration_minutes), 0)::numeric(7,2)::text AS avg
        FROM test_results WHERE duration_minutes IS NOT NULL
      `,
    ]);

    const statusMap: Record<string, number> = {};
    let totalTests = 0;
    for (const row of statusCounts) {
      statusMap[row.status] = parseInt(row.count, 10);
      totalTests += parseInt(row.count, 10);
    }

    return {
      builders: parseInt(builderCount?.count || '0', 10),
      testers: parseInt(testerCount?.count || '0', 10),
      total_tests: totalTests,
      test_statuses: statusMap,
      avg_completion_minutes: parseFloat(avgTime?.avg || '0'),
      financials: {
        total_topups_cents: parseInt(financials?.total_topups || '0', 10),
        total_commissions_cents: parseInt(financials?.total_commissions || '0', 10),
        total_payouts_cents: parseInt(financials?.total_payouts || '0', 10),
        total_charges_cents: parseInt(financials?.total_charges || '0', 10),
      },
    };
  });

  // GET /api/v1/admin/stats/activity — daily activity for charts
  app.get('/stats/activity', async (request: FastifyRequest<{ Querystring: { days?: string } }>) => {
    const days = Math.min(parseInt((request.query as { days?: string }).days || '30', 10), 90);

    const [dailyTests, dailyRevenue, dailySignups] = await Promise.all([
      sql<{ date: string; flow: string; review: string }[]>`
        SELECT
          date_trunc('day', created_at)::date::text AS date,
          count(*) FILTER (WHERE template_type = 'flow_test')::text AS flow,
          count(*) FILTER (WHERE template_type = 'review_test')::text AS review
        FROM test_cases
        WHERE created_at >= now() - ${days + ' days'}::interval AND type = 'standard'
        GROUP BY 1 ORDER BY 1
      `,
      sql<{ date: string; topups: string; commissions: string; payouts: string }[]>`
        SELECT
          date_trunc('day', created_at)::date::text AS date,
          coalesce(sum(CASE WHEN type = 'topup' THEN currency_amount_cents END), 0)::text AS topups,
          coalesce(sum(CASE WHEN type = 'commission' THEN currency_amount_cents END), 0)::text AS commissions,
          coalesce(sum(CASE WHEN type = 'payout' THEN currency_amount_cents END), 0)::text AS payouts
        FROM transactions
        WHERE created_at >= now() - ${days + ' days'}::interval
        GROUP BY 1 ORDER BY 1
      `,
      sql<{ date: string; builders: string; testers: string }[]>`
        SELECT d.date::text,
          coalesce(b.cnt, 0)::text AS builders,
          coalesce(t.cnt, 0)::text AS testers
        FROM generate_series(
          (now() - ${days + ' days'}::interval)::date,
          now()::date,
          '1 day'
        ) AS d(date)
        LEFT JOIN (
          SELECT date_trunc('day', created_at)::date AS day, count(*) AS cnt
          FROM builders WHERE created_at >= now() - ${days + ' days'}::interval GROUP BY 1
        ) b ON b.day = d.date
        LEFT JOIN (
          SELECT date_trunc('day', created_at)::date AS day, count(*) AS cnt
          FROM testers WHERE created_at >= now() - ${days + ' days'}::interval GROUP BY 1
        ) t ON t.day = d.date
        ORDER BY 1
      `,
    ]);

    return {
      daily_tests: dailyTests.map(r => ({ date: r.date, flow: parseInt(r.flow, 10), review: parseInt(r.review, 10) })),
      daily_revenue: dailyRevenue.map(r => ({
        date: r.date,
        topups: parseInt(r.topups, 10),
        commissions: parseInt(r.commissions, 10),
        payouts: parseInt(r.payouts, 10),
      })),
      daily_signups: dailySignups.map(r => ({
        date: r.date,
        builders: parseInt(r.builders, 10),
        testers: parseInt(r.testers, 10),
      })),
    };
  });

  // GET /api/v1/admin/builders — list all builders
  app.get('/builders', async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string; search?: string } }>) => {
    const q = request.query as { page?: string; limit?: string; search?: string };
    const page = Math.max(parseInt(q.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(q.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;
    const search = q.search?.trim() || '';

    const searchFilter = search
      ? sql`AND (b.display_name ILIKE ${'%' + search + '%'} OR b.email ILIKE ${'%' + search + '%'})`
      : sql``;

    const [[{ count }], builders] = await Promise.all([
      sql<{ count: string }[]>`SELECT count(*)::text FROM builders b WHERE 1=1 ${searchFilter}`,
      sql`
        SELECT b.id, b.display_name, b.email, b.plan_tier, b.created_at, b.updated_at, b.last_login_at,
          coalesce(cb.available, 0) AS credits_available,
          coalesce(cb.reserved, 0) AS credits_reserved,
          (SELECT count(*) FROM test_cases tc WHERE tc.builder_id = b.id)::int AS test_count,
          (SELECT count(*) FROM api_keys ak WHERE ak.builder_id = b.id AND ak.revoked_at IS NULL)::int AS active_api_keys
        FROM builders b
        LEFT JOIN credit_balances cb ON cb.builder_id = b.id
        WHERE 1=1 ${searchFilter}
        ORDER BY b.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    return {
      builders,
      total: parseInt(count, 10),
      page,
      per_page: limit,
      total_pages: Math.ceil(parseInt(count, 10) / limit),
    };
  });

  // PATCH /api/v1/admin/builders/:id — update a builder
  app.patch('/builders/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: { display_name?: string; plan_tier?: string } }>) => {
    const { id } = request.params;
    const body = request.body as { display_name?: string; plan_tier?: string };
    const updates: Record<string, unknown> = {};
    if (body.display_name !== undefined) updates.display_name = body.display_name;
    if (body.plan_tier !== undefined) updates.plan_tier = body.plan_tier;

    if (Object.keys(updates).length === 0) {
      return { ok: true };
    }

    const [updated] = await sql`
      UPDATE builders SET ${sql(updates)}, updated_at = now()
      WHERE id = ${id}
      RETURNING id, display_name, email, plan_tier, created_at, updated_at
    `;
    return updated;
  });

  // GET /api/v1/admin/testers — list all testers
  app.get('/testers', async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string; search?: string; status?: string } }>) => {
    const q = request.query as { page?: string; limit?: string; search?: string; status?: string };
    const page = Math.max(parseInt(q.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(q.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;
    const search = q.search?.trim() || '';
    const statusFilter = q.status;

    const searchFrag = search
      ? sql`AND (t.display_name ILIKE ${'%' + search + '%'} OR t.email ILIKE ${'%' + search + '%'})`
      : sql``;
    const statusFrag = statusFilter === 'active' ? sql`AND t.is_active = true`
      : statusFilter === 'inactive' ? sql`AND t.is_active = false`
      : statusFilter === 'pending' ? sql`AND t.onboarded = false`
      : sql``;

    const [[{ count }], testers] = await Promise.all([
      sql<{ count: string }[]>`SELECT count(*)::text FROM testers t WHERE 1=1 ${searchFrag} ${statusFrag}`,
      sql`
        SELECT t.id, t.display_name, t.email, t.region, t.skills, t.languages, t.devices,
          t.is_active, t.is_available, t.onboarded, t.tasks_completed, t.tasks_total,
          t.avg_completion_minutes, t.earnings_cents, t.max_invites, t.timezone, t.created_at, t.updated_at, t.last_login_at
        FROM testers t
        WHERE 1=1 ${searchFrag} ${statusFrag}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    return {
      testers,
      total: parseInt(count, 10),
      page,
      per_page: limit,
      total_pages: Math.ceil(parseInt(count, 10) / limit),
    };
  });

  // PATCH /api/v1/admin/testers/:id — update a tester (all fields)
  app.patch('/testers/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      display_name?: string; region?: string; is_active?: boolean; onboarded?: boolean;
      is_available?: boolean; timezone?: string | null;
      skills?: string[]; languages?: string[]; devices?: string[];
      max_invites?: number;
    }
  }>) => {
    const { id } = request.params;
    const body = request.body as Record<string, unknown>;
    const allowed = ['display_name', 'region', 'is_active', 'onboarded', 'is_available', 'timezone', 'skills', 'languages', 'devices', 'max_invites'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        // JSONB array fields need sql.json()
        if (['skills', 'languages', 'devices'].includes(key)) {
          updates[key] = sql.json(body[key] as never);
        } else {
          updates[key] = body[key];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return { ok: true };
    }

    // Check if this is an activation (is_active flipping to true)
    const isActivating = body.is_active === true;
    let wasPreviouslyInactive = false;
    if (isActivating) {
      const existing = await TesterModel.findById(id);
      wasPreviouslyInactive = !!existing && !existing.is_active;
    }

    // Check if this is a deactivation (is_active flipping to false)
    const isDeactivating = body.is_active === false;
    let wasPreviouslyActive = false;
    if (isDeactivating) {
      const existing = await TesterModel.findById(id);
      wasPreviouslyActive = !!existing && existing.is_active;
    }

    const [updated] = await sql`
      UPDATE testers SET ${sql(updates)}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    // Send acceptance email when tester is newly activated
    if (wasPreviouslyInactive && updated?.email) {
      EmailService.sendTesterAccepted(updated.email, updated.display_name).catch((err) => {
        request.log.error({ err, testerId: id }, 'Failed to send tester acceptance email');
      });
    }

    // Send deactivation email when tester is newly deactivated
    if (wasPreviouslyActive && updated?.email) {
      EmailService.sendTesterDeactivated(updated.email, 'support@blendedagents.com').catch((err) => {
        request.log.error({ err, testerId: id }, 'Failed to send tester deactivation email');
      });
    }

    return updated;
  });

  // GET /api/v1/admin/testers/:id/referrals — invite codes and referred testers
  app.get('/testers/:id/referrals', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const { id } = request.params;

    const invites = await sql<Array<{
      id: string; code: string; used_by_id: string | null; used_at: Date | null; created_at: Date;
      referred_name: string | null; referred_email: string | null;
    }>>`
      SELECT ti.id, ti.code, ti.used_by_id, ti.used_at, ti.created_at,
        t.display_name AS referred_name, t.email AS referred_email
      FROM tester_invites ti
      LEFT JOIN testers t ON t.id = ti.used_by_id
      WHERE ti.inviter_id = ${id}
      ORDER BY ti.created_at DESC
    `;

    const [tester] = await sql<{ max_invites: number }[]>`SELECT max_invites FROM testers WHERE id = ${id}`;

    return {
      max_invites: tester?.max_invites ?? 0,
      total_generated: invites.length,
      total_used: invites.filter(i => i.used_by_id).length,
      invites,
    };
  });

  // GET /api/v1/admin/testers/:id/assessment — tester's onboarding assessment with step results and grade
  app.get('/testers/:id/assessment', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const { id } = request.params;

    const signUrl = async (key: string | null | undefined): Promise<string | null> => {
      if (!key) return null;
      return S3Service.getDownloadUrl(key).catch(() => null);
    };

    // Get the assessment test case
    const [assessment] = await sql`
      SELECT tc.id, tc.title, tc.status, tc.steps, tc.created_at, tc.completed_at,
        tc.assessment_config,
        tr.verdict, tr.summary, tr.steps_passed, tr.steps_failed, tr.steps_blocked, tr.steps_total,
        tr.recording_url, tr.annotations_url
      FROM test_cases tc
      LEFT JOIN test_results tr ON tr.test_case_id = tc.id
      WHERE tc.type = 'onboarding_assessment'
        AND tc.assigned_tester_id = ${id}
      ORDER BY tc.created_at DESC
      LIMIT 1
    `;

    if (!assessment) {
      return { assessment: null };
    }

    // Get step results
    const stepResults = await sql`
      SELECT step_index, status, severity, actual_behavior, screenshot_url, notes, created_at
      FROM step_results
      WHERE test_case_id = ${assessment.id}
      ORDER BY step_index ASC
    `;

    // Generate presigned download URLs
    const [recordingDownloadUrl, annotationsDownloadUrl] = await Promise.all([
      signUrl(assessment.recording_url),
      signUrl(assessment.annotations_url),
    ]);

    const stepsWithDownloads = await Promise.all(
      stepResults.map(async (sr: { screenshot_url?: string; [k: string]: unknown }) => ({
        ...sr,
        screenshot_download_url: await signUrl(sr.screenshot_url),
      })),
    );

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        status: assessment.status,
        steps: assessment.steps,
        created_at: assessment.created_at,
        completed_at: assessment.completed_at,
        verdict: assessment.verdict,
        summary: assessment.summary,
        steps_passed: assessment.steps_passed,
        steps_failed: assessment.steps_failed,
        steps_blocked: assessment.steps_blocked,
        steps_total: assessment.steps_total,
        grade: assessment.assessment_config?.grade ?? null,
        recording_url: assessment.recording_url,
        recording_download_url: recordingDownloadUrl,
        annotations_url: assessment.annotations_url,
        annotations_download_url: annotationsDownloadUrl,
        step_results: stepsWithDownloads,
      },
    };
  });

  // GET /api/v1/admin/testers/:id/submissions — tester's completed test submissions
  app.get('/testers/:id/submissions', async (request: FastifyRequest<{ Params: { id: string }; Querystring: { page?: string; limit?: string } }>) => {
    const { id } = request.params;
    const q = request.query as { page?: string; limit?: string };
    const page = Math.max(parseInt(q.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(q.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;

    const [[{ count }], submissions] = await Promise.all([
      sql<{ count: string }[]>`
        SELECT count(*)::text FROM test_cases tc WHERE tc.assigned_tester_id = ${id} AND tc.type = 'standard'
      `,
      sql`
        SELECT tc.id, tc.title, tc.template_type, tc.status,
          CASE WHEN tc.template_type = 'flow_test'
            THEN 2 + coalesce(jsonb_array_length(tc.steps), 0)
            ELSE 3
          END AS credit_cost,
          tc.created_at, tc.assigned_at, tc.completed_at,
          b.display_name AS builder_name,
          tr.verdict, tr.summary,
          tr.steps_passed, tr.steps_failed
        FROM test_cases tc
        LEFT JOIN builders b ON b.id = tc.builder_id
        LEFT JOIN test_results tr ON tr.test_case_id = tc.id AND tr.tester_id = ${id}
        WHERE tc.assigned_tester_id = ${id} AND tc.type = 'standard'
        ORDER BY tc.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    return {
      submissions,
      total: parseInt(count, 10),
      page,
      per_page: limit,
      total_pages: Math.ceil(parseInt(count, 10) / limit),
    };
  });

  // GET /api/v1/admin/test-cases — list all test cases across builders
  app.get('/test-cases', async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string; search?: string; status?: string; template_type?: string; builder_id?: string; tester_id?: string } }>) => {
    const q = request.query as { page?: string; limit?: string; search?: string; status?: string; template_type?: string; builder_id?: string; tester_id?: string };
    const page = Math.max(parseInt(q.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(q.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;
    const search = q.search?.trim() || '';
    const status = q.status?.trim() || '';
    const templateType = q.template_type?.trim() || '';
    const builderId = q.builder_id?.trim() || '';
    const testerId = q.tester_id?.trim() || '';

    const searchFrag = search
      ? sql`AND (tc.title ILIKE ${'%' + search + '%'} OR b.display_name ILIKE ${'%' + search + '%'} OR b.email ILIKE ${'%' + search + '%'})`
      : sql``;
    const statusFrag = status ? sql`AND tc.status = ${status}` : sql``;
    const typeFrag = templateType ? sql`AND tc.template_type = ${templateType}` : sql``;
    const builderFrag = builderId ? sql`AND tc.builder_id = ${builderId}` : sql``;
    const testerFrag = testerId ? sql`AND tc.assigned_tester_id = ${testerId}` : sql``;
    const excludeAssessments = sql`AND tc.type = 'standard'`;

    const [[{ count }], testCases] = await Promise.all([
      sql<{ count: string }[]>`
        SELECT count(*)::text FROM test_cases tc
        LEFT JOIN builders b ON b.id = tc.builder_id
        WHERE 1=1 ${excludeAssessments} ${searchFrag} ${statusFrag} ${typeFrag} ${builderFrag} ${testerFrag}
      `,
      sql`
        SELECT tc.id, tc.title, tc.template_type, tc.status, tc.created_at, tc.updated_at,
          tc.assigned_at, tc.started_at, tc.completed_at,
          CASE WHEN tc.template_type = 'flow_test'
            THEN 2 + coalesce(jsonb_array_length(tc.steps), 0)
            ELSE 3
          END AS credit_cost,
          b.display_name AS builder_name, b.email AS builder_email,
          t.display_name AS tester_name
        FROM test_cases tc
        LEFT JOIN builders b ON b.id = tc.builder_id
        LEFT JOIN testers t ON t.id = tc.assigned_tester_id
        WHERE 1=1 ${excludeAssessments} ${searchFrag} ${statusFrag} ${typeFrag} ${builderFrag} ${testerFrag}
        ORDER BY tc.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    return {
      test_cases: testCases,
      total: parseInt(count, 10),
      page,
      per_page: limit,
      total_pages: Math.ceil(parseInt(count, 10) / limit),
    };
  });

  // PATCH /api/v1/admin/test-cases/:id/reassign — reassign a test case to a different tester
  app.patch('/test-cases/:id/reassign', async (request: FastifyRequest<{
    Params: { id: string };
    Body: { tester_id: string; reason?: string };
  }>) => {
    const { id } = request.params;
    const { tester_id, reason } = request.body as { tester_id: string; reason?: string };

    if (!tester_id) throw Errors.badRequest('tester_id is required');

    const tester = await TesterModel.findById(tester_id);
    if (!tester) throw Errors.notFound('Tester');
    if (!tester.is_active) throw Errors.badRequest('Tester is not active');

    await AssignmentService.adminReassign(id, tester_id, reason);

    const [updated] = await sql`SELECT * FROM test_cases WHERE id = ${id}`;

    // Send reassignment email to the new tester
    if (tester.email && updated) {
      const stepCount = Array.isArray(updated.steps) ? updated.steps.length : 0;
      EmailService.sendTestReassigned(tester.email, {
        title: updated.title,
        templateType: updated.template_type,
        stepCount,
        taskUrl: `${process.env.APP_URL || 'https://blendedagents.com'}/tester/tasks/${updated.id}`,
      }).catch((err) => {
        request.log.error({ err, testCaseId: id, testerId: tester_id }, 'Failed to send test reassigned email');
      });
    }

    return updated;
  });

  // GET /api/v1/admin/transactions — list all transactions
  app.get('/transactions', async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string; type?: string } }>) => {
    const q = request.query as { page?: string; limit?: string; type?: string };
    const page = Math.max(parseInt(q.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(q.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;
    const type = q.type?.trim() || '';

    const typeFrag = type ? sql`AND t.type = ${type}` : sql``;

    const [[{ count }], transactions] = await Promise.all([
      sql<{ count: string }[]>`SELECT count(*)::text FROM transactions t WHERE 1=1 ${typeFrag}`,
      sql`
        SELECT t.id, t.type, t.credit_amount, t.currency_amount_cents, t.description, t.created_at,
          b.display_name AS builder_name,
          te.display_name AS tester_name
        FROM transactions t
        LEFT JOIN builders b ON b.id = t.builder_id
        LEFT JOIN testers te ON te.id = t.tester_id
        WHERE 1=1 ${typeFrag}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    return {
      transactions,
      total: parseInt(count, 10),
      page,
      per_page: limit,
      total_pages: Math.ceil(parseInt(count, 10) / limit),
    };
  });

  // ── Email Templates ──────────────────────────────────────────

  // GET /api/v1/admin/email-templates — list all templates
  app.get('/email-templates', async () => {
    const templates = await sql`
      SELECT name, subject, description, category, variables, updated_at,
        length(html_content) AS html_length
      FROM email_templates
      ORDER BY category, name
    `;
    return { templates };
  });

  // GET /api/v1/admin/email-templates/:name — get single template with HTML
  app.get('/email-templates/:name', async (request: FastifyRequest<{ Params: { name: string } }>) => {
    const { name } = request.params;
    const [template] = await sql`
      SELECT * FROM email_templates WHERE name = ${name}
    `;
    if (!template) throw Errors.notFound('Template not found');
    return template;
  });

  // PUT /api/v1/admin/email-templates/:name — update template
  app.put('/email-templates/:name', async (request: FastifyRequest<{
    Params: { name: string };
    Body: { subject?: string; html_content?: string };
  }>) => {
    const { name } = request.params;
    const body = request.body as { subject?: string; html_content?: string };

    const updates: Record<string, unknown> = {};
    if (typeof body.subject === 'string') updates.subject = body.subject;
    if (typeof body.html_content === 'string') updates.html_content = body.html_content;

    if (Object.keys(updates).length === 0) throw Errors.badRequest('No fields to update');

    // Build dynamic update
    const setClauses: string[] = ['updated_at = now()'];
    if (updates.subject) setClauses.push('subject');
    if (updates.html_content) setClauses.push('html_content');

    let updated;
    if (updates.subject && updates.html_content) {
      [updated] = await sql`
        UPDATE email_templates
        SET subject = ${updates.subject as string}, html_content = ${updates.html_content as string}, updated_at = now()
        WHERE name = ${name} RETURNING *
      `;
    } else if (updates.subject) {
      [updated] = await sql`
        UPDATE email_templates
        SET subject = ${updates.subject as string}, updated_at = now()
        WHERE name = ${name} RETURNING *
      `;
    } else {
      [updated] = await sql`
        UPDATE email_templates
        SET html_content = ${updates.html_content as string}, updated_at = now()
        WHERE name = ${name} RETURNING *
      `;
    }
    if (!updated) throw Errors.notFound('Template not found');
    return updated;
  });

  // POST /api/v1/admin/email-templates/:name/preview — render with sample variables
  app.post('/email-templates/:name/preview', async (request: FastifyRequest<{ Params: { name: string } }>) => {
    const { name } = request.params;
    const [template] = await sql<{ html_content: string; variables: string[] }[]>`
      SELECT html_content, variables FROM email_templates WHERE name = ${name}
    `;
    if (!template) throw Errors.notFound('Template not found');

    let html = template.html_content;
    // Fill variables with sample values
    for (const v of template.variables) {
      html = html.replaceAll(`{{${v}}}`, sampleValue(v));
    }
    // Show all conditional blocks in preview
    html = html.replace(/<!--\s*IF:(\w+)\s*-->/g, '').replace(/<!--\s*ENDIF:(\w+)\s*-->/g, '');
    return { html };
  });

  // POST /api/v1/admin/email-templates/:name/send-test — send test email to admin
  app.post('/email-templates/:name/send-test', async (request: FastifyRequest<{
    Params: { name: string };
    Body: { to: string };
  }>) => {
    const { name } = request.params;
    const { to } = request.body as { to: string };
    if (!to) throw Errors.badRequest('Recipient email required');

    const [template] = await sql<{ html_content: string; subject: string; variables: string[] }[]>`
      SELECT html_content, subject, variables FROM email_templates WHERE name = ${name}
    `;
    if (!template) throw Errors.notFound('Template not found');

    let html = template.html_content;
    for (const v of template.variables) {
      html = html.replaceAll(`{{${v}}}`, sampleValue(v));
    }
    html = html.replace(/<!--\s*IF:(\w+)\s*-->/g, '').replace(/<!--\s*ENDIF:(\w+)\s*-->/g, '');

    await EmailService.sendTestEmail(to, name, template.subject, html);
    return { ok: true, sent_to: to };
  });

  // ── Assessments Catalog ────────────────────────────────────────

  // GET /api/v1/admin/assessments — list all assessments with stats
  app.get('/assessments', async () => {
    // Get stats per assessment_id from test_cases metadata
    const stats = await sql<{
      assessment_id: string;
      total: string;
      completed: string;
      passed: string;
      avg_detection: string;
      avg_clarity: string;
    }[]>`
      SELECT
        tc.metadata->>'assessment_id' AS assessment_id,
        count(*)::text AS total,
        count(*) FILTER (WHERE tc.status = 'completed')::text AS completed,
        count(*) FILTER (WHERE (tc.assessment_config->'grade'->>'passed')::boolean = true)::text AS passed,
        COALESCE(AVG((tc.assessment_config->'grade'->>'detection_score')::numeric) FILTER (WHERE tc.assessment_config->'grade' IS NOT NULL), 0)::numeric(4,2)::text AS avg_detection,
        COALESCE(AVG((tc.assessment_config->'grade'->>'clarity_score')::numeric) FILTER (WHERE tc.assessment_config->'grade' IS NOT NULL), 0)::numeric(4,2)::text AS avg_clarity
      FROM test_cases tc
      WHERE tc.type = 'onboarding_assessment'
      GROUP BY tc.metadata->>'assessment_id'
    `;

    // Also count legacy assessments (no assessment_id in metadata)
    const [legacy] = await sql<{
      total: string; completed: string; passed: string; avg_detection: string; avg_clarity: string;
    }[]>`
      SELECT
        count(*)::text AS total,
        count(*) FILTER (WHERE tc.status = 'completed')::text AS completed,
        count(*) FILTER (WHERE (tc.assessment_config->'grade'->>'passed')::boolean = true)::text AS passed,
        COALESCE(AVG((tc.assessment_config->'grade'->>'detection_score')::numeric) FILTER (WHERE tc.assessment_config->'grade' IS NOT NULL), 0)::numeric(4,2)::text AS avg_detection,
        COALESCE(AVG((tc.assessment_config->'grade'->>'clarity_score')::numeric) FILTER (WHERE tc.assessment_config->'grade' IS NOT NULL), 0)::numeric(4,2)::text AS avg_clarity
      FROM test_cases tc
      WHERE tc.type = 'onboarding_assessment' AND (tc.metadata->>'assessment_id') IS NULL
    `;

    const statsMap = new Map(stats.map(s => [s.assessment_id, s]));
    // Map legacy stats to acme-shop
    if (legacy && parseInt(legacy.total) > 0 && !statsMap.has('acme-shop')) {
      statsMap.set('acme-shop', { assessment_id: 'acme-shop', ...legacy });
    }

    const assessments = ASSESSMENT_CATALOG.map(a => {
      const s = statsMap.get(a.id);
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        difficulty: a.difficulty,
        sandbox_url: a.sandbox_url,
        bug_count: a.config.planted_issues.length,
        pass_detection: a.config.pass_detection,
        pass_clarity: a.config.pass_clarity,
        categories: a.config.planted_issues.map(i => i.category),
        steps_count: a.steps.length,
        stats: {
          total_assigned: parseInt(s?.total || '0'),
          total_completed: parseInt(s?.completed || '0'),
          total_passed: parseInt(s?.passed || '0'),
          pass_rate: parseInt(s?.completed || '0') > 0
            ? Math.round((parseInt(s?.passed || '0') / parseInt(s?.completed || '0')) * 100)
            : 0,
          avg_detection: parseFloat(s?.avg_detection || '0'),
          avg_clarity: parseFloat(s?.avg_clarity || '0'),
        },
      };
    });

    return { assessments };
  });

  // GET /api/v1/admin/assessments/:id — get full assessment detail
  app.get('/assessments/:id', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const { id } = request.params;
    const assessment = ASSESSMENT_CATALOG.find(a => a.id === id);
    if (!assessment) throw Errors.notFound('Assessment not found');

    // Get recent submissions for this assessment
    const submissions = await sql`
      SELECT tc.id, tc.status, tc.created_at, tc.completed_at,
        tc.assessment_config->'grade' AS grade,
        t.display_name AS tester_name, t.email AS tester_email
      FROM test_cases tc
      LEFT JOIN testers t ON t.id = tc.assigned_tester_id
      WHERE tc.type = 'onboarding_assessment'
        AND (tc.metadata->>'assessment_id' = ${id}
          OR (${id} = 'acme-shop' AND (tc.metadata->>'assessment_id') IS NULL))
      ORDER BY tc.created_at DESC
      LIMIT 20
    `;

    return {
      ...assessment,
      steps: assessment.steps,
      config: assessment.config,
      recent_submissions: submissions,
    };
  });
}

function sampleValue(variable: string): string {
  const samples: Record<string, string> = {
    DISPLAY_NAME: 'Jane',
    CREDITS_BALANCE: '150',
    CREDITS_PURCHASED: '100',
    CREDITS_REFUNDED: '13',
    CURRENCY_AMOUNT: '$10.00',
    DASHBOARD_URL: 'https://blendedagents.com/builder',
    SKILL_MD_URL: 'https://blendedagents.com/skill.md',
    TWEET_FOR_CREDITS_URL: 'https://blendedagents.com/builder/credits',
    TOPUP_URL: 'https://blendedagents.com/builder/credits',
    RESULTS_URL: 'https://blendedagents.com/builder/test-cases/abc123',
    EARNINGS_URL: 'https://blendedagents.com/tester/earnings',
    REFERRALS_URL: 'https://blendedagents.com/tester/referrals',
    TASK_URL: 'https://blendedagents.com/tester/tasks/abc123',
    RECORDING_URL: 'https://blendedagents.com/recordings/abc123',
    TEST_TITLE: 'Login Flow Verification',
    TEST_CASE_ID: 'TC-001',
    TEST_VERDICT: 'pass',
    STEPS_PASSED: '4',
    STEPS_TOTAL: '5',
    DURATION_MINUTES: '12',
    WEBHOOK_URL: 'https://example.com/webhook',
    RETRY_COUNT: '3',
    LAST_ERROR: 'Connection timeout',
    TASK_TITLE: 'Login Flow Verification',
    TEMPLATE_TYPE: 'flow_test',
    STEP_COUNT: '5',
    ACCEPTANCE_DEADLINE: 'April 15, 2026 at 10:00 AM',
    VERDICT: 'pass',
    PAYOUT_AMOUNT: '$4.50',
    TOTAL_EARNINGS: '$127.50',
    INVITE_CODE: 'BA-DEMO1234',
    USED_INVITES: '3',
    MAX_INVITES: '5',
    PERIOD_START: 'April 7, 2026',
    PERIOD_END: 'April 13, 2026',
    TASKS_COMPLETED: '8',
    ASSESSMENT_GRADE: 'A (92%)',
    SUPPORT_EMAIL: 'support@blendedagents.com',
  };
  return samples[variable] || `[${variable}]`;
}
