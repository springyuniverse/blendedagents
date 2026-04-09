'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getTemplate, type EnforcedTemplate } from '@/lib/api';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

const TEMPLATE_META: Record<string, { accent: string; accentBg: string; accentBorder: string }> = {
  flow_test: { accent: 'text-accent-flow', accentBg: 'bg-accent-flow/10', accentBorder: 'border-accent-flow/20' },
  review_test: { accent: 'text-accent-review', accentBg: 'bg-accent-review/10', accentBorder: 'border-accent-review/20' },
};

function FieldRow({ name, field }: { name: string; field: { required: boolean; type: string; description: string; options?: string[] } }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-subtle last:border-0">
      <code className="text-sm font-mono text-accent-flow min-w-[140px] pt-0.5">{name}</code>
      <span className="px-1.5 py-0.5 bg-surface-secondary rounded text-[11px] font-mono text-text-secondary shrink-0">{field.type}</span>
      <span className="text-sm text-text-secondary flex-1 leading-relaxed">{field.description}</span>
      <span className={`text-[11px] font-semibold shrink-0 ${field.required ? 'text-red-500' : 'text-text-muted'}`}>
        {field.required ? 'REQUIRED' : 'OPTIONAL'}
      </span>
    </div>
  );
}

function SchemaSection({ title, schema, accentClass }: { title: string; schema: Record<string, { required: boolean; type: string; description: string; options?: string[] }>; accentClass: string }) {
  return (
    <div className="mb-6">
      <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${accentClass} mb-3`}>{title}</h3>
      <div className="bg-surface border border-border rounded-lg p-4">
        {Object.entries(schema).map(([name, field]) => (
          <FieldRow key={name} name={name} field={field} />
        ))}
      </div>
    </div>
  );
}

function buildExamplePayload(template: EnforcedTemplate): Record<string, unknown> {
  const payload: Record<string, unknown> = { template_type: template.id };

  for (const [key, field] of Object.entries(template.fields)) {
    if (field.type === 'url') payload[key] = `https://staging.example.com`;
    else if (field.type === 'enum' && field.options) payload[key] = field.options[0];
    else if (field.type === 'array' && field.options) payload[key] = field.options.slice(0, 2);
    else if (field.type === 'array') payload[key] = [];
    else if (field.type === 'object') payload[key] = {};
    else if (field.type === 'text' || field.type === 'string') payload[key] = `your_${key}_here`;
    else payload[key] = null;
  }

  if (template.step_schema) {
    const step: Record<string, string | null> = {};
    for (const [key, field] of Object.entries(template.step_schema)) {
      step[key] = field.required ? `your_${key}_here` : null;
    }
    payload.steps = [step];
  }

  return payload;
}

function buildExampleWebhook(template: EnforcedTemplate): Record<string, unknown> {
  if (template.id === 'flow_test') {
    return {
      test_id: 'tc_abc123',
      template_type: 'flow_test',
      status: 'failed',
      passed_steps: 3,
      total_steps: 5,
      duration_minutes: 12,
      results: [
        { step: 1, status: 'passed' },
        { step: 2, status: 'failed', severity: 'major', actual_behavior: 'Button unresponsive on first click', screenshot_url: 'https://cdn.example.com/screenshot.png' },
        { step: 3, status: 'skipped', notes: 'Blocked by step 2 failure' },
      ],
      completed_at: '2026-04-03T14:32:00Z',
    };
  }
  return {
    test_id: 'tc_def456',
    template_type: 'review_test',
    status: 'issues_found',
    total_findings: 3,
    duration_minutes: 18,
    findings: [
      { id: 'f1', severity: 'critical', category: 'functionality', description: 'Add to cart button does nothing on mobile', device: 'mobile_safari', location: 'Product detail page' },
      { id: 'f2', severity: 'major', category: 'layout', description: 'Hero image overlaps nav on tablet', device: 'tablet', location: 'Homepage' },
      { id: 'f3', severity: 'minor', category: 'typography', description: 'Font fallback visible on first load', device: 'desktop_chrome', location: 'All pages' },
    ],
    credits_breakdown: { base: 3, bonus: 7.5, total: 10.5 },
    completed_at: '2026-04-03T15:10:00Z',
  };
}

function syntaxHighlight(json: string): React.ReactNode[] {
  const lines = json.split('\n');
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      // String values (after colon)
      let match = remaining.match(/^(.*?)(: )"((?:[^"\\]|\\.)*)"(.*)$/);
      if (match) {
        // Key part before colon
        parts.push(...colorizeKey(match[1], key));
        key += 10;
        parts.push(<span key={key++} className="text-text-primary">{match[2]}</span>);
        parts.push(<span key={key++} className="text-[#2e7d32]">&quot;{match[3]}&quot;</span>);
        remaining = match[4];
        continue;
      }

      // Property keys
      match = remaining.match(/^(\s*)"((?:[^"\\]|\\.)*)"(\s*:.*)$/);
      if (match) {
        parts.push(<span key={key++}>{match[1]}</span>);
        parts.push(<span key={key++} className="text-[#1565c0]">&quot;{match[2]}&quot;</span>);
        remaining = match[3];
        continue;
      }

      // Standalone strings (in arrays)
      match = remaining.match(/^(\s*)"((?:[^"\\]|\\.)*)"(.*)$/);
      if (match) {
        parts.push(<span key={key++}>{match[1]}</span>);
        parts.push(<span key={key++} className="text-[#2e7d32]">&quot;{match[2]}&quot;</span>);
        remaining = match[3];
        continue;
      }

      // Numbers
      match = remaining.match(/^(.*?)(\b\d+\.?\d*\b)(.*)$/);
      if (match) {
        parts.push(<span key={key++} className="text-text-primary">{match[1]}</span>);
        parts.push(<span key={key++} className="text-[#e65100]">{match[2]}</span>);
        remaining = match[3];
        continue;
      }

      // Booleans and null
      match = remaining.match(/^(.*?)\b(true|false|null)\b(.*)$/);
      if (match) {
        parts.push(<span key={key++} className="text-text-primary">{match[1]}</span>);
        parts.push(<span key={key++} className="text-[#7b1fa2]">{match[2]}</span>);
        remaining = match[3];
        continue;
      }

      // Brackets and remaining
      parts.push(<span key={key++} className="text-text-muted">{remaining}</span>);
      remaining = '';
    }

    return <div key={i} className="flex whitespace-pre"><span className="select-none text-text-muted/40 w-8 text-right mr-4 shrink-0">{i + 1}</span><span>{parts}</span></div>;
  });
}

function colorizeKey(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = startKey;
  const match = text.match(/^(\s*)"((?:[^"\\]|\\.)*)"$/);
  if (match) {
    parts.push(<span key={key++}>{match[1]}</span>);
    parts.push(<span key={key++} className="text-[#1565c0]">&quot;{match[2]}&quot;</span>);
  } else {
    parts.push(<span key={key++} className="text-text-primary">{text}</span>);
  }
  return parts;
}

function JsonBlock({ data, label }: { data: Record<string, unknown>; label: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-4">
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between px-4 py-2.5 bg-surface-secondary hover:bg-surface-secondary/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
          <span className="text-[13px] font-mono text-text-primary">{label}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-text-muted hover:text-text-secondary hover:bg-surface transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-accent-review" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {open && (
        <div className="px-4 py-3 bg-surface-code text-[13px] leading-[1.7] font-mono overflow-x-auto max-h-[400px]">
          {syntaxHighlight(json)}
        </div>
      )}
    </div>
  );
}

function PricingSection({ template }: { template: EnforcedTemplate }) {
  const meta = TEMPLATE_META[template.id];
  const p = template.pricing;

  return (
    <div className={`${meta.accentBg} border ${meta.accentBorder} rounded-lg p-5`}>
      <h3 className={`text-sm font-semibold ${meta.accent} mb-2`}>
        Pricing: {p.model === 'fixed' ? 'Fixed' : 'Base + Bonus'}
      </h3>
      {p.model === 'fixed' ? (
        <p className="text-sm text-text-secondary leading-relaxed">
          {p.base_credits} base + {p.cost_per_step} per step. Builder pays upfront when submitting.
          Credits are non-refundable once a tester picks up the task.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-2 bg-surface/60 rounded-lg text-center">
              <div className={`text-lg font-bold ${meta.accent}`}>{p.base_credits}</div>
              <div className="text-[11px] text-text-secondary">Base</div>
            </div>
            <span className="text-text-muted text-lg">+</span>
            {p.bonus_per_finding && Object.entries(p.bonus_per_finding).map(([sev, bonus]) => (
              <div key={sev} className="px-3 py-2 bg-surface/60 rounded-lg text-center border border-border">
                <div className="text-lg font-bold text-text-primary">+{bonus}</div>
                <div className="text-[11px] text-text-secondary capitalize">per {sev}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-text-secondary">
            Capped at {p.max_findings_cap} findings per review. Builder can rate findings — tester quality score adjusts over time.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TemplateSchemaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const meta = TEMPLATE_META[id] ?? TEMPLATE_META.flow_test;

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: () => getTemplate(id),
  });

  if (isLoading || !template) {
    return (
      <div className="max-w-2xl animate-pulse space-y-4">
        <div className="h-6 bg-surface-secondary rounded w-1/3" />
        <div className="h-4 bg-surface-secondary rounded w-2/3" />
        <div className="h-32 bg-surface-secondary rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-1 text-sm">
        <Link href="/builder/templates" className="text-text-secondary hover:text-text-primary">Templates</Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-medium">{template.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{template.name} Schema</h1>
          <p className="text-sm text-text-secondary mt-0.5">{template.description}</p>
        </div>
        <Link
          href={`/builder/test-cases/new?template=${template.id}`}
          className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
            template.id === 'flow_test'
              ? 'bg-accent-flow hover:bg-accent-flow/90'
              : 'bg-accent-review hover:bg-accent-review/90'
          }`}
        >
          Create Test Case
        </Link>
      </div>

      {/* Request fields */}
      <SchemaSection title="Request fields" schema={template.fields} accentClass={meta.accent} />

      {/* Step schema (flow test) */}
      {template.step_schema && (
        <SchemaSection title="Step schema (each item in steps array)" schema={template.step_schema} accentClass={meta.accent} />
      )}

      {/* Finding schema (review test) */}
      {template.finding_schema && (
        <SchemaSection title="Finding schema (tester submits these)" schema={template.finding_schema} accentClass={meta.accent} />
      )}

      {/* JSON Examples */}
      <div className="mb-6">
        <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${meta.accent} mb-3`}>JSON Examples</h3>
        <JsonBlock data={buildExamplePayload(template)} label="example_request_body.json" />
        <JsonBlock data={buildExampleWebhook(template)} label="example_webhook_response.json" />
      </div>

      {/* Pricing */}
      <PricingSection template={template} />
    </div>
  );
}
