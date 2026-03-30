import { TestTemplateModel, type TestTemplate } from '../models/test-template.js';
import { TestCaseService } from './test-case.service.js';
import { Errors } from '../lib/errors.js';

export const TemplateService = {
  async create(builderId: string, data: {
    title: string;
    description?: string;
    steps: Record<string, unknown>[];
    metadata?: Record<string, unknown>;
    environment?: string;
    tags?: string[];
    expected_behavior?: string;
  }): Promise<TestTemplate> {
    return TestTemplateModel.create({
      builder_id: builderId,
      title: data.title,
      description: data.description,
      steps: data.steps,
      metadata: data.metadata,
      environment: data.environment,
      tags: data.tags,
      expected_behavior: data.expected_behavior,
    });
  },

  async list(builderId: string): Promise<TestTemplate[]> {
    return TestTemplateModel.listByBuilder(builderId);
  },

  async getById(templateId: string, builderId: string): Promise<TestTemplate> {
    const template = await TestTemplateModel.findById(templateId);
    if (!template || template.builder_id !== builderId) {
      throw Errors.notFound('Template');
    }
    return template;
  },

  async update(templateId: string, builderId: string, data: Partial<Pick<TestTemplate, 'title' | 'description' | 'steps' | 'metadata'>>): Promise<TestTemplate> {
    const template = await TestTemplateModel.findById(templateId);
    if (!template || template.builder_id !== builderId) {
      throw Errors.notFound('Template');
    }
    return TestTemplateModel.update(templateId, data);
  },

  async delete(templateId: string, builderId: string): Promise<void> {
    const template = await TestTemplateModel.findById(templateId);
    if (!template || template.builder_id !== builderId) {
      throw Errors.notFound('Template');
    }
    await TestTemplateModel.delete(templateId);
  },

  async useTemplate(templateId: string, builderId: string, overrides: {
    title?: string;
    description?: string;
    staging_url: string;
    credentials?: Record<string, unknown>;
    environment?: string;
    tags?: string[];
    external_id?: string;
    callback_url?: string;
    required_skills?: string[];
  }) {
    const template = await TestTemplateModel.findById(templateId);
    if (!template || template.builder_id !== builderId) {
      throw Errors.notFound('Template');
    }

    return TestCaseService.create(builderId, {
      title: overrides.title ?? template.title,
      description: overrides.description ?? template.description ?? '',
      staging_url: overrides.staging_url,
      steps: template.steps,
      expected_behavior: template.expected_behavior ?? '',
      credentials: overrides.credentials,
      environment: overrides.environment ?? template.environment ?? undefined,
      tags: overrides.tags ?? template.tags,
      external_id: overrides.external_id,
      callback_url: overrides.callback_url,
      required_skills: overrides.required_skills,
      template_id: templateId,
    });
  },
};
