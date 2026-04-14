import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../../email-templates');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM || 'BlendedAgents <noreply@blendedagents.com>';
const APP_URL = process.env.APP_URL || 'https://blendedagents.com';

function loadTemplate(name: string, vars: Record<string, string>): string {
  let html = readFileSync(resolve(TEMPLATES_DIR, `${name}.html`), 'utf-8');
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
    const html = loadTemplate('builder-welcome', {
      DISPLAY_NAME: displayName || 'there',
      CREDITS_BALANCE: String(creditsBalance),
      DASHBOARD_URL: `${APP_URL}/builder`,
      SKILL_MD_URL: `${APP_URL}/skill.md`,
      TWEET_FOR_CREDITS_URL: `${APP_URL}/builder/credits`,
    });
    await send(to, 'Welcome to BlendedAgents', html);
  },

  async sendCreditPurchase(to: string, creditsPurchased: number, currencyAmount: string, creditsBalance: number) {
    const html = loadTemplate('credit-purchase', {
      CREDITS_PURCHASED: String(creditsPurchased),
      CURRENCY_AMOUNT: currencyAmount,
      CREDITS_BALANCE: String(creditsBalance),
      DASHBOARD_URL: `${APP_URL}/builder`,
    });
    await send(to, 'Credits added to your account', html);
  },

  async sendCreditsLow(to: string, creditsBalance: number) {
    const html = loadTemplate('credits-low', {
      CREDITS_BALANCE: String(creditsBalance),
      TOPUP_URL: `${APP_URL}/builder/credits`,
    });
    await send(to, 'Your credit balance is running low', html);
  },

  async sendTestResultsReady(
    to: string,
    test: { title: string; shortId: string; verdict: string; stepsPassed: number; stepsTotal: number; durationMinutes: number; recordingUrl?: string | null },
  ) {
    let html = loadTemplate('test-results-ready', {
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
    const html = loadTemplate('webhook-failed', {
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
    const html = loadTemplate('test-expired', {
      TEST_TITLE: test.title,
      TEST_CASE_ID: test.shortId,
      CREDITS_REFUNDED: String(test.creditsRefunded),
      DASHBOARD_URL: `${APP_URL}/builder`,
    });
    await send(to, `Test expired: "${test.title}"`, html);
  },

  async sendPaymentFailed(to: string, currencyAmount: string) {
    const html = loadTemplate('payment-failed', {
      CURRENCY_AMOUNT: currencyAmount,
      TOPUP_URL: `${APP_URL}/builder/credits`,
    });
    await send(to, 'Payment failed — action required', html);
  },

  // ── Tester Emails ───────────────────────────────────────────────

  async sendTesterWelcome(to: string, displayName: string, inviteCode: string) {
    const html = loadTemplate('tester-welcome', {
      DISPLAY_NAME: displayName || 'there',
      INVITE_CODE: inviteCode,
      DASHBOARD_URL: `${APP_URL}/tester`,
    });
    await send(to, 'Welcome to BlendedAgents — let\'s get you started', html);
  },

  async sendAssessmentResults(to: string, displayName: string, grade: string, passed: boolean) {
    let html = loadTemplate('assessment-results', {
      DISPLAY_NAME: displayName || 'there',
      ASSESSMENT_GRADE: grade,
      DASHBOARD_URL: `${APP_URL}/tester`,
    });
    html = processConditionals(html, passed ? ['ASSESSMENT_PASSED'] : ['ASSESSMENT_NOT_PASSED']);
    await send(to, 'Your assessment results are in', html);
  },

  async sendTesterAccepted(to: string, displayName: string) {
    const html = loadTemplate('tester-accepted', {
      DISPLAY_NAME: displayName || 'there',
      DASHBOARD_URL: `${APP_URL}/tester`,
    });
    await send(to, 'You\'re in! Welcome to BlendedAgents', html);
  },

  async sendTesterDeactivated(to: string, supportEmail: string) {
    const html = loadTemplate('tester-deactivated', {
      SUPPORT_EMAIL: supportEmail || 'support@blendedagents.com',
    });
    await send(to, 'Your BlendedAgents account has been paused', html);
  },

  async sendTaskAssigned(to: string, task: { title: string; templateType: string; stepCount: number; acceptanceDeadline: string; taskUrl: string }) {
    const html = loadTemplate('task-assigned', {
      TASK_TITLE: task.title,
      TEMPLATE_TYPE: task.templateType,
      STEP_COUNT: String(task.stepCount),
      ACCEPTANCE_DEADLINE: task.acceptanceDeadline,
      TASK_URL: task.taskUrl,
    });
    await send(to, `New task assigned: "${task.title}"`, html);
  },

  async sendTestReassigned(to: string, task: { title: string; templateType: string; stepCount: number; taskUrl: string }) {
    const html = loadTemplate('test-reassigned', {
      TASK_TITLE: task.title,
      TEMPLATE_TYPE: task.templateType,
      STEP_COUNT: String(task.stepCount),
      TASK_URL: task.taskUrl,
    });
    await send(to, `New task assigned: "${task.title}"`, html);
  },

  async sendTaskCompleted(to: string, displayName: string, task: { title: string; verdict: string; payoutAmount: string; totalEarnings: string }) {
    const html = loadTemplate('task-completed', {
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
    const html = loadTemplate('weekly-payout', {
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
    const html = loadTemplate('referral-used', {
      INVITE_CODE: inviteCode,
      USED_INVITES: String(usedInvites),
      MAX_INVITES: String(maxInvites),
      REFERRALS_URL: `${APP_URL}/tester/referrals`,
    });
    await send(to, 'Someone used your invite code', html);
  },

  async sendPayoutCompleted(to: string, payout: { periodStart: string; periodEnd: string; tasksCompleted: number; payoutAmount: string }) {
    const html = loadTemplate('payout-completed', {
      PERIOD_START: payout.periodStart,
      PERIOD_END: payout.periodEnd,
      TASKS_COMPLETED: String(payout.tasksCompleted),
      PAYOUT_AMOUNT: payout.payoutAmount,
      EARNINGS_URL: `${APP_URL}/tester/earnings`,
    });
    await send(to, `Payout complete — ${payout.payoutAmount} sent`, html);
  },
};
