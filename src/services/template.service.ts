import { Errors } from '../lib/errors.js';

export interface EnforcedTemplate {
  id: 'flow_test' | 'review_test';
  name: string;
  description: string;
  pricing: {
    model: 'fixed' | 'base_plus_bonus';
    base_credits: number;
    cost_per_step?: number;
    bonus_per_finding?: { critical: number; major: number; minor: number };
    max_findings_cap?: number;
  };
  fields: Record<string, {
    required: boolean;
    type: string;
    description: string;
    options?: string[];
  }>;
  step_schema?: Record<string, {
    required: boolean;
    type: string;
    description: string;
  }>;
  finding_schema?: Record<string, {
    required: boolean;
    type: string;
    description: string;
    options?: string[];
  }>;
}

const FLOW_TEST_TEMPLATE: EnforcedTemplate = {
  id: 'flow_test',
  name: 'Flow Test',
  description: 'Structured step-by-step verification. AI agent provides steps, tester follows each sequentially and reports pass/fail with evidence. Best for user journeys, workflows, and multi-step processes.',
  pricing: {
    model: 'fixed',
    base_credits: 2,
    cost_per_step: 1,
  },
  fields: {
    title: { required: true, type: 'string', description: 'Test case title' },
    staging_url: { required: true, type: 'url', description: 'URL to test' },
    environment: { required: true, type: 'enum', description: 'Deployment environment', options: ['staging', 'production', 'localhost'] },
    expected_behavior: { required: true, type: 'text', description: 'Overall expected outcome' },
    callback_url: { required: false, type: 'url', description: 'Webhook URL for results' },
    credentials: { required: false, type: 'object', description: 'Staging credentials (encrypted at rest)' },
    steps: { required: true, type: 'array', description: 'Ordered steps for tester to follow (min 1)' },
    tags: { required: false, type: 'array', description: 'Filterable tags' },
    external_id: { required: false, type: 'string', description: "Builder's reference ID" },
  },
  step_schema: {
    instruction: { required: true, type: 'text', description: 'Action for the tester to perform' },
    expected_behavior: { required: false, type: 'text', description: 'Expected result after performing the action' },
  },
};

const REVIEW_TEST_TEMPLATE: EnforcedTemplate = {
  id: 'review_test',
  name: 'Review Test',
  description: 'Exploratory review with bonus findings. AI agent provides a URL and context, tester explores freely and reports every issue found. No rigid steps. Bonus credits per valid finding based on severity.',
  pricing: {
    model: 'base_plus_bonus',
    base_credits: 3,
    bonus_per_finding: { critical: 3, major: 2, minor: 0.5 },
    max_findings_cap: 10,
  },
  fields: {
    title: { required: true, type: 'string', description: 'Test case title' },
    staging_url: { required: true, type: 'url', description: 'URL to review' },
    environment: { required: true, type: 'enum', description: 'Deployment environment', options: ['staging', 'production', 'localhost'] },
    context: { required: true, type: 'text', description: 'Describes what the app is and who it is for — guides the tester judgment' },
    devices_to_check: { required: true, type: 'array', description: 'Devices/browsers to check', options: ['desktop_chrome', 'desktop_firefox', 'desktop_safari', 'mobile_safari', 'mobile_android', 'tablet'] },
    callback_url: { required: false, type: 'url', description: 'Webhook URL for results' },
    focus_areas: { required: false, type: 'array', description: 'Narrows scope: layout, typography, forms, images, content, functionality' },
    ignore_areas: { required: false, type: 'text', description: 'What to skip — prevents noise from known WIP areas' },
    credentials: { required: false, type: 'object', description: 'Staging credentials (encrypted at rest)' },
    tags: { required: false, type: 'array', description: 'Filterable tags' },
    external_id: { required: false, type: 'string', description: "Builder's reference ID" },
  },
  finding_schema: {
    severity: { required: true, type: 'enum', description: 'Issue severity', options: ['critical', 'major', 'minor'] },
    category: { required: true, type: 'enum', description: 'Issue category', options: ['functionality', 'layout', 'content', 'typography', 'forms', 'images'] },
    description: { required: true, type: 'text', description: 'Clear description of what is wrong and where' },
    screenshot_url: { required: true, type: 'url', description: 'Visual proof' },
    device: { required: true, type: 'string', description: 'Which device/browser this was found on' },
    location: { required: true, type: 'text', description: 'Where on the page — helps devs find the issue' },
  },
};

const TEMPLATES: Record<string, EnforcedTemplate> = {
  flow_test: FLOW_TEST_TEMPLATE,
  review_test: REVIEW_TEST_TEMPLATE,
};

export const TemplateService = {
  list(): EnforcedTemplate[] {
    return [FLOW_TEST_TEMPLATE, REVIEW_TEST_TEMPLATE];
  },

  getById(templateId: string): EnforcedTemplate {
    const template = TEMPLATES[templateId];
    if (!template) {
      throw Errors.notFound('Template');
    }
    return template;
  },
};
