import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../../email-templates');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM || 'BlendedAgents <noreply@blendedagents.com>';

function loadTemplate(name: string, vars: Record<string, string>): string {
  let html = readFileSync(resolve(TEMPLATES_DIR, `${name}.html`), 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

export const EmailService = {
  async sendTesterAccepted(to: string, displayName: string) {
    const html = loadTemplate('tester-accepted', {
      DISPLAY_NAME: displayName || 'there',
      DASHBOARD_URL: `${process.env.APP_URL || 'https://blendedagents.com'}/tester`,
    });

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'You\'re in! Welcome to BlendedAgents',
      html,
    });
  },
};
