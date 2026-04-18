import { Resend } from 'resend';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sql from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../../email-templates');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM || 'BlendedAgents <noreply@blendedagents.com>';
const APP_URL = process.env.APP_URL || 'https://blendedagents.com';

/** Load template: DB first, filesystem fallback */
function loadTemplate(name: string, vars: Record<string, string>): string {
  // Synchronous filesystem load (DB override handled in loadTemplateAsync)
  let html = readFileSync(resolve(TEMPLATES_DIR, `${name}.html`), 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

/** Async template load — checks DB first, falls back to filesystem */
async function loadTemplateAsync(name: string, vars: Record<string, string>): Promise<string> {
  const [row] = await sql<{ html_content: string }[]>`
    SELECT html_content FROM email_templates WHERE name = ${name}
  `;
  let html = row?.html_content ?? readFileSync(resolve(TEMPLATES_DIR, `${name}.html`), 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

/** Strip conditional blocks: keeps <!-- IF:KEY -->...<!-- ENDIF:KEY --> if key is in `show`, removes if not */
function processConditionals(html: string, show: string[]): string {
  return html.replace(
    /<!--\s*IF:(\w+)\s*-->([\s\S]*?)<!--\s*ENDIF:\1\s*-->/g,
    (_, key, content) => show.includes(key) ? content : '',
  );
}

async function send(to: string, subject: string, html: string) {
  await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
}

export const EmailService = {
  // ── Builder Emails ──────────────────────────────────────────────

  async sendBuilderWelcome(to: string, displayName: string, creditsBalance: number) {
    const html = await loadTemplateAsync('builder-welcome', {
      DISPLAY_NAME: displayName || 'there',
      CREDITS_BALANCE: String(creditsBalance),
      DASHBOARD_URL: `${APP_URL}/builder`,
      SKILL_MD_URL: `${APP_URL}/skill.md`,
      TWEET_FOR_CREDITS_URL: `${APP_URL}/builder/credits`,
    });
    await send(to, 'Welcome to BlendedAgents', html);
  },

  async sendCreditPurchase(to: string, creditsPurchased: number, currencyAmount: string, creditsBalance: number) {
    const html = await loadTemplateAsync('credit-purchase', {
      CREDITS_PURCHASED: String(creditsPurchased),
      CURRENCY_AMOUNT: currencyAmount,
      CREDITS_BALANCE: String(creditsBalance),
      DASHBOARD_URL: `${APP_URL}/builder`,
    });
    await send(to, 'Credits added to your account', html);
  },

  async sendCreditsLow(to: string, creditsBalance: number) {
    const html = await loadTemplateAsync('credits-low', {
      CREDITS_BALANCE: String(creditsBalance),
      TOPUP_URL: `${APP_URL}/builder/credits`,
    });
    await send(to, 'Your credit balance is running low', html);
  },

  async sendTestResultsReady(
    to: string,
    test: { title: string; shortId: string; verdict: string; stepsPassed: number; stepsTotal: number; durationMinutes: number; recordingUrl?: string | null },
  ) {
    let html = await loadTemplateAsync('test-results-ready', {
      TEST_TITLE: test.title,
      TEST_CASE_ID: test.shortId,
      TEST_VERDICT: test.verdict,
      STEPS_PASSED: String(test.stepsPassed),
      STEPS_TOTAL: String(test.stepsTotal),
      DURATION_MINUTES: String(test.durationMinutes),
      RESULTS_URL: `${APP_URL}/builder/test-cases/${test.shortId}`,
      RECORDING_URL: test.recordingUrl || '',
    });
    const show: string[] = [];
    if (test.verdict === 'pass') show.push('VERDICT_PASS');
    else if (test.verdict === 'fail') show.push('VERDICT_FAIL');
    else show.push('VERDICT_PARTIAL');
    if (test.recordingUrl) show.push('HAS_SCREEN_RECORDING');
    html = processConditionals(html, show);
    await send(to, `Results ready for "${test.title}"`, html);
  },

  async sendWebhookFailed(
    to: string,
    test: { title: string; shortId: string; webhookUrl: string; retryCount: number; lastError: string },
  ) {
    const html = await loadTemplateAsync('webhook-failed', {
      TEST_TITLE: test.title,
      TEST_CASE_ID: test.shortId,
      WEBHOOK_URL: test.webhookUrl,
      RETRY_COUNT: String(test.retryCount),
      LAST_ERROR: test.lastError,
      RESULTS_URL: `${APP_URL}/builder/test-cases/${test.shortId}`,
    });
    await send(to, `Webhook delivery failed for "${test.title}"`, html);
  },

  async sendTestExpired(to: string, test: { title: string; shortId: string; creditsRefunded: number }) {
    const html = await loadTemplateAsync('test-expired', {
      TEST_TITLE: test.title,
      TEST_CASE_ID: test.shortId,
      CREDITS_REFUNDED: String(test.creditsRefunded),
      DASHBOARD_URL: `${APP_URL}/builder`,
    });
    await send(to, `Test expired: "${test.title}"`, html);
  },

  async sendPaymentFailed(to: string, currencyAmount: string) {
    const html = await loadTemplateAsync('payment-failed', {
      CURRENCY_AMOUNT: currencyAmount,
      TOPUP_URL: `${APP_URL}/builder/credits`,
    });
    await send(to, 'Payment failed — action required', html);
  },

  // ── Tester Emails ───────────────────────────────────────────────

  async sendTesterWelcome(to: string, displayName: string, inviteCode: string) {
    const html = await loadTemplateAsync('tester-welcome', {
      DISPLAY_NAME: displayName || 'there',
      INVITE_CODE: inviteCode,
      DASHBOARD_URL: `${APP_URL}/tester`,
    });
    await send(to, 'Welcome to BlendedAgents — let\'s get you started', html);
  },

  async sendAssessmentResults(to: string, displayName: string, grade: string, passed: boolean) {
    let html = await loadTemplateAsync('assessment-results', {
      DISPLAY_NAME: displayName || 'there',
      ASSESSMENT_GRADE: grade,
      DASHBOARD_URL: `${APP_URL}/tester`,
    });
    html = processConditionals(html, passed ? ['ASSESSMENT_PASSED'] : ['ASSESSMENT_NOT_PASSED']);
    await send(to, 'Your assessment results are in', html);
  },

  async sendTesterAccepted(to: string, displayName: string) {
    const html = await loadTemplateAsync('tester-accepted', {
      DISPLAY_NAME: displayName || 'there',
      DASHBOARD_URL: `${APP_URL}/tester`,
    });
    await send(to, 'You\'re in! Welcome to BlendedAgents', html);
  },

  async sendTesterDeactivated(to: string, supportEmail: string) {
    const html = await loadTemplateAsync('tester-deactivated', {
      SUPPORT_EMAIL: supportEmail || 'support@blendedagents.com',
    });
    await send(to, 'Your BlendedAgents account has been paused', html);
  },

  async sendTaskAssigned(to: string, task: { title: string; templateType: string; stepCount: number; acceptanceDeadline: string; taskUrl: string }) {
    const html = await loadTemplateAsync('task-assigned', {
      TASK_TITLE: task.title,
      TEMPLATE_TYPE: task.templateType,
      STEP_COUNT: String(task.stepCount),
      ACCEPTANCE_DEADLINE: task.acceptanceDeadline,
      TASK_URL: task.taskUrl,
    });
    await send(to, `New task assigned: "${task.title}"`, html);
  },

  async sendTestReassigned(to: string, task: { title: string; templateType: string; stepCount: number; taskUrl: string }) {
    const html = await loadTemplateAsync('test-reassigned', {
      TASK_TITLE: task.title,
      TEMPLATE_TYPE: task.templateType,
      STEP_COUNT: String(task.stepCount),
      TASK_URL: task.taskUrl,
    });
    await send(to, `New task assigned: "${task.title}"`, html);
  },

  async sendTaskCompleted(to: string, displayName: string, task: { title: string; verdict: string; payoutAmount: string; totalEarnings: string }) {
    const html = await loadTemplateAsync('task-completed', {
      DISPLAY_NAME: displayName || 'there',
      TASK_TITLE: task.title,
      VERDICT: task.verdict,
      PAYOUT_AMOUNT: task.payoutAmount,
      TOTAL_EARNINGS: task.totalEarnings,
      EARNINGS_URL: `${APP_URL}/tester/earnings`,
    });
    await send(to, `Task complete — you earned ${task.payoutAmount}`, html);
  },

  async sendWeeklyPayout(to: string, payout: { periodStart: string; periodEnd: string; tasksCompleted: number; payoutAmount: string; totalEarnings: string }) {
    const html = await loadTemplateAsync('weekly-payout', {
      PERIOD_START: payout.periodStart,
      PERIOD_END: payout.periodEnd,
      TASKS_COMPLETED: String(payout.tasksCompleted),
      PAYOUT_AMOUNT: payout.payoutAmount,
      TOTAL_EARNINGS: payout.totalEarnings,
      EARNINGS_URL: `${APP_URL}/tester/earnings`,
    });
    await send(to, `Your weekly earnings: ${payout.payoutAmount}`, html);
  },

  async sendReferralUsed(to: string, inviteCode: string, usedInvites: number, maxInvites: number) {
    const html = await loadTemplateAsync('referral-used', {
      INVITE_CODE: inviteCode,
      USED_INVITES: String(usedInvites),
      MAX_INVITES: String(maxInvites),
      REFERRALS_URL: `${APP_URL}/tester/referrals`,
    });
    await send(to, 'Someone used your invite code', html);
  },

  async sendPayoutCompleted(to: string, payout: { periodStart: string; periodEnd: string; tasksCompleted: number; payoutAmount: string }) {
    const html = await loadTemplateAsync('payout-completed', {
      PERIOD_START: payout.periodStart,
      PERIOD_END: payout.periodEnd,
      TASKS_COMPLETED: String(payout.tasksCompleted),
      PAYOUT_AMOUNT: payout.payoutAmount,
      EARNINGS_URL: `${APP_URL}/tester/earnings`,
    });
    await send(to, `Payout complete — ${payout.payoutAmount} sent`, html);
  },

  /** Send a test email with sample variables filled in */
  async sendTestEmail(to: string, templateName: string, subject: string, htmlContent: string) {
    await resend.emails.send({ from: FROM_ADDRESS, to, subject: `[TEST] ${subject}`, html: htmlContent });
  },
};

// ── Admin Notifications ────────────────────────────────────────

export type AdminNotificationType = 'new_builder' | 'new_tester' | 'test_case_submitted' | 'test_case_completed' | 'tweet_reward_submitted' | 'payout_processed';

const NOTIFICATION_SUBJECTS: Record<AdminNotificationType, string> = {
  new_builder: 'New builder registered',
  new_tester: 'New tester registered',
  test_case_submitted: 'New test case submitted',
  test_case_completed: 'Test case completed',
  tweet_reward_submitted: 'Tweet reward awaiting review',
  payout_processed: 'Payout processed',
};

const NOTIFICATION_ADMIN_URLS: Record<AdminNotificationType, string> = {
  new_builder: '/admin/builders',
  new_tester: '/admin/testers',
  test_case_submitted: '/admin/test-cases',
  test_case_completed: '/admin/test-cases',
  tweet_reward_submitted: '/admin/tweet-rewards',
  payout_processed: '/admin/financials',
};

/**
 * Send admin notification email if enabled in platform settings.
 * Fire-and-forget — never throws, just logs errors.
 */
export async function sendAdminNotification(
  type: AdminNotificationType,
  detail: { actorName: string; actorEmail: string; message: string },
) {
  try {
    // Check if this notification type is enabled
    const [settings] = await sql<{ admin_notify_emails: string[]; admin_notifications: Record<string, boolean> }[]>`
      SELECT admin_notify_emails, admin_notifications FROM platform_settings WHERE id = 1
    `;
    if (!settings) return;
    if (!settings.admin_notifications[type]) return;
    if (!settings.admin_notify_emails || settings.admin_notify_emails.length === 0) return;

    const html = await loadTemplateAsync('admin-notification', {
      NOTIFICATION_TITLE: NOTIFICATION_SUBJECTS[type],
      NOTIFICATION_MESSAGE: detail.message,
      EVENT_TYPE: type.replace(/_/g, ' '),
      ACTOR_NAME: detail.actorName,
      ACTOR_EMAIL: detail.actorEmail,
      EVENT_TIME: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      ADMIN_URL: `${APP_URL}${NOTIFICATION_ADMIN_URLS[type]}`,
    });

    const subject = `[Admin] ${NOTIFICATION_SUBJECTS[type]}`;

    for (const email of settings.admin_notify_emails) {
      await resend.emails.send({ from: FROM_ADDRESS, to: email, subject, html });
    }
  } catch (err) {
    console.error('Failed to send admin notification', type, err);
  }
}

// ── Template metadata for seeding ───────────────────────────────

const TEMPLATE_META: Record<string, { subject: string; description: string; category: string; variables: string[] }> = {
  'builder-welcome': { subject: 'Welcome to BlendedAgents', description: 'Sent to new builders after signup', category: 'builder', variables: ['DISPLAY_NAME', 'CREDITS_BALANCE', 'DASHBOARD_URL', 'SKILL_MD_URL', 'TWEET_FOR_CREDITS_URL'] },
  'credit-purchase': { subject: 'Credits added to your account', description: 'Sent after successful credit purchase', category: 'builder', variables: ['CREDITS_PURCHASED', 'CURRENCY_AMOUNT', 'CREDITS_BALANCE', 'DASHBOARD_URL'] },
  'credits-low': { subject: 'Your credit balance is running low', description: 'Sent when builder credits drop below threshold', category: 'builder', variables: ['CREDITS_BALANCE', 'TOPUP_URL'] },
  'test-results-ready': { subject: 'Results ready for your test', description: 'Sent when a tester completes a test case', category: 'builder', variables: ['TEST_TITLE', 'TEST_CASE_ID', 'TEST_VERDICT', 'STEPS_PASSED', 'STEPS_TOTAL', 'DURATION_MINUTES', 'RESULTS_URL', 'RECORDING_URL'] },
  'webhook-failed': { subject: 'Webhook delivery failed', description: 'Sent when webhook delivery exhausts all retries', category: 'builder', variables: ['TEST_TITLE', 'TEST_CASE_ID', 'WEBHOOK_URL', 'RETRY_COUNT', 'LAST_ERROR', 'RESULTS_URL'] },
  'test-expired': { subject: 'Test expired', description: 'Sent when a test case expires without completion', category: 'builder', variables: ['TEST_TITLE', 'TEST_CASE_ID', 'CREDITS_REFUNDED', 'DASHBOARD_URL'] },
  'payment-failed': { subject: 'Payment failed — action required', description: 'Sent when a Stripe payment fails', category: 'builder', variables: ['CURRENCY_AMOUNT', 'TOPUP_URL'] },
  'tester-welcome': { subject: "Welcome to BlendedAgents — let's get you started", description: 'Sent to new testers after signup', category: 'tester', variables: ['DISPLAY_NAME', 'INVITE_CODE', 'DASHBOARD_URL'] },
  'assessment-results': { subject: 'Your assessment results are in', description: 'Sent after assessment is graded', category: 'tester', variables: ['DISPLAY_NAME', 'ASSESSMENT_GRADE', 'DASHBOARD_URL'] },
  'tester-accepted': { subject: "You're in! Welcome to BlendedAgents", description: 'Sent when admin activates a tester', category: 'tester', variables: ['DISPLAY_NAME', 'DASHBOARD_URL'] },
  'tester-deactivated': { subject: 'Your BlendedAgents account has been paused', description: 'Sent when admin deactivates a tester', category: 'tester', variables: ['SUPPORT_EMAIL'] },
  'task-assigned': { subject: 'New task assigned', description: 'Sent when a test is assigned to a tester', category: 'tester', variables: ['TASK_TITLE', 'TEMPLATE_TYPE', 'STEP_COUNT', 'ACCEPTANCE_DEADLINE', 'TASK_URL'] },
  'test-reassigned': { subject: 'New task assigned', description: 'Sent when a test is reassigned to a different tester', category: 'tester', variables: ['TASK_TITLE', 'TEMPLATE_TYPE', 'STEP_COUNT', 'TASK_URL'] },
  'task-completed': { subject: 'Task complete — earnings added', description: 'Sent to tester when their submission is accepted', category: 'tester', variables: ['DISPLAY_NAME', 'TASK_TITLE', 'VERDICT', 'PAYOUT_AMOUNT', 'TOTAL_EARNINGS', 'EARNINGS_URL'] },
  'weekly-payout': { subject: 'Your weekly earnings summary', description: 'Weekly earnings summary for testers', category: 'tester', variables: ['PERIOD_START', 'PERIOD_END', 'TASKS_COMPLETED', 'PAYOUT_AMOUNT', 'TOTAL_EARNINGS', 'EARNINGS_URL'] },
  'referral-used': { subject: 'Someone used your invite code', description: 'Sent when a referral code is redeemed', category: 'tester', variables: ['INVITE_CODE', 'USED_INVITES', 'MAX_INVITES', 'REFERRALS_URL'] },
  'payout-completed': { subject: 'Payout complete — funds sent', description: 'Sent when a payout is processed via Stripe', category: 'tester', variables: ['PERIOD_START', 'PERIOD_END', 'TASKS_COMPLETED', 'PAYOUT_AMOUNT', 'EARNINGS_URL'] },
  'admin-notification': { subject: 'Admin notification', description: 'Generic admin alert for platform events', category: 'system', variables: ['NOTIFICATION_TITLE', 'NOTIFICATION_MESSAGE', 'EVENT_TYPE', 'ACTOR_NAME', 'ACTOR_EMAIL', 'EVENT_TIME', 'ADMIN_URL'] },
};

/** Seed email_templates table from filesystem if empty */
export async function seedEmailTemplates(): Promise<void> {
  const [{ count }] = await sql<{ count: string }[]>`SELECT count(*)::text FROM email_templates`;
  if (parseInt(count) > 0) return;

  const files = readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.html'));
  for (const file of files) {
    const name = file.replace('.html', '');
    const meta = TEMPLATE_META[name];
    if (!meta) continue; // skip auth templates (confirm-signup, etc.)
    const htmlContent = readFileSync(resolve(TEMPLATES_DIR, file), 'utf-8');
    await sql`
      INSERT INTO email_templates (name, subject, html_content, description, category, variables)
      VALUES (${name}, ${meta.subject}, ${htmlContent}, ${meta.description}, ${meta.category}, ${meta.variables})
      ON CONFLICT (name) DO NOTHING
    `;
  }
}
