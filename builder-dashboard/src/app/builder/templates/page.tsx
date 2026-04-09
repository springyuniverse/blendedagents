'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listTemplates, type EnforcedTemplate } from '@/lib/api';

const TEMPLATE_META: Record<string, { icon: string; accent: string; accentBg: string }> = {
  flow_test: { icon: '\u2192', accent: 'text-accent-flow', accentBg: 'bg-accent-flow/10' },
  review_test: { icon: '\u25CE', accent: 'text-accent-review', accentBg: 'bg-accent-review/10' },
};

function PricingBadge({ template }: { template: EnforcedTemplate }) {
  if (template.pricing.model === 'fixed') {
    return (
      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-accent-flow/10 text-accent-flow tracking-wide">
        FIXED PRICE
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-accent-review/10 text-accent-review tracking-wide">
      BASE + BONUS
    </span>
  );
}

function PricingDetail({ template }: { template: EnforcedTemplate }) {
  const p = template.pricing;
  if (p.model === 'fixed') {
    return (
      <p className="text-sm text-text-secondary">
        {p.base_credits} base + {p.cost_per_step} per step credit
      </p>
    );
  }
  return (
    <div className="text-sm text-text-secondary space-y-0.5">
      <p>{p.base_credits} base credits</p>
      {p.bonus_per_finding && (
        <p>
          +{p.bonus_per_finding.critical} critical, +{p.bonus_per_finding.major} major, +{p.bonus_per_finding.minor} minor per finding
        </p>
      )}
      {p.max_findings_cap && <p>Capped at {p.max_findings_cap} findings</p>}
    </div>
  );
}

export default function TemplatesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });
  const templates = data?.templates ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Test Templates</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Two enforced templates. Two modes of human testing. One guided, one exploratory.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-lg shadow-soft p-6 animate-pulse">
              <div className="h-5 bg-surface-secondary rounded w-1/3 mb-3" />
              <div className="h-3 bg-surface-secondary rounded w-2/3 mb-2" />
              <div className="h-3 bg-surface-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg shadow-soft p-8 text-center">
          <p className="text-sm text-text-secondary">No templates loaded. Make sure the backend is running.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {templates.map((template) => {
            const meta = TEMPLATE_META[template.id] ?? TEMPLATE_META.flow_test;
            const requiredFields = Object.entries(template.fields).filter(([, f]) => f.required);
            const optionalFields = Object.entries(template.fields).filter(([, f]) => !f.required);

            return (
              <div key={template.id} className="bg-surface border border-border rounded-lg shadow-soft hover:shadow-lifted transition-all duration-200">
                {/* Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg ${meta.accentBg} flex items-center justify-center text-lg`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-semibold text-text-primary">{template.name}</h2>
                    </div>
                    <PricingBadge template={template} />
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{template.description}</p>
                </div>

                {/* Fields */}
                <div className="px-6 pb-4">
                  <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${meta.accent} mb-2`}>
                    Required fields ({requiredFields.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {requiredFields.map(([key]) => (
                      <span key={key} className="px-2 py-0.5 bg-surface-secondary border border-border rounded text-xs font-mono text-text-secondary">
                        {key}
                      </span>
                    ))}
                  </div>

                  {optionalFields.length > 0 && (
                    <>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                        Optional ({optionalFields.length})
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {optionalFields.map(([key]) => (
                          <span key={key} className="px-2 py-0.5 bg-surface-secondary border border-border rounded text-xs font-mono text-text-muted">
                            {key}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Pricing */}
                <div className="px-6 pb-4">
                  <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${meta.accent} mb-1.5`}>
                    Pricing
                  </h3>
                  <PricingDetail template={template} />
                </div>

                {/* Action */}
                <div className="px-6 pb-6 grid grid-cols-2 gap-2">
                  <Link
                    href={`/builder/test-cases/new?template=${template.id}`}
                    className={`text-center px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-all duration-200 ${
                      template.id === 'flow_test'
                        ? 'bg-accent-flow'
                        : 'bg-accent-review'
                    }`}
                  >
                    Create Test Case
                  </Link>
                  <Link
                    href={`/builder/templates/${template.id}`}
                    className="text-center px-4 py-2.5 border border-border text-text-secondary text-sm font-medium rounded-lg hover:bg-surface-secondary transition-all duration-200"
                  >
                    View Schema
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
