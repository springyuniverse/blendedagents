'use client';

import type { TestResult, FlowTestResult, ReviewTestResult } from '@/lib/api';
import { AnnotationPlayback } from './AnnotationPlayback';

const VERDICT_STYLES: Record<string, string> = {
  pass: 'bg-accent-review/10 text-accent-review border-accent-review/20',
  fail: 'bg-accent-danger/10 text-accent-danger border-accent-danger/20',
  partial: 'bg-accent-warning/10 text-accent-warning border-accent-warning/20',
  blocked: 'bg-text-muted/10 text-text-secondary border-border',
  issues_found: 'bg-accent-warning/10 text-accent-warning border-accent-warning/20',
  no_issues: 'bg-accent-review/10 text-accent-review border-accent-review/20',
};

const VERDICT_LABELS: Record<string, string> = {
  pass: 'Passed',
  fail: 'Failed',
  partial: 'Partial',
  blocked: 'Blocked',
  issues_found: 'Issues Found',
  no_issues: 'No Issues',
};

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  critical: { badge: 'bg-accent-danger/10 text-accent-danger', border: 'border-l-accent-danger' },
  major: { badge: 'bg-accent-warning/10 text-accent-warning', border: 'border-l-accent-warning' },
  minor: { badge: 'bg-text-muted/10 text-text-secondary', border: 'border-l-text-muted' },
};

const CATEGORY_STYLES: Record<string, string> = {
  functionality: 'bg-accent-danger/10 text-accent-danger',
  layout: 'bg-accent-warning/10 text-accent-warning',
  content: 'bg-accent-flow/10 text-accent-flow',
  typography: 'bg-violet-500/10 text-violet-600',
  forms: 'bg-accent-review/10 text-accent-review',
  images: 'bg-pink-500/10 text-pink-600',
};

function FlowResults({ result }: { result: FlowTestResult }) {
  return (
    <>
      {result.recording_download_url && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-2">
            Screen Recording
            {result.annotations_download_url && (
              <span className="ml-2 text-[11px] font-normal text-text-muted uppercase tracking-wider">with annotations</span>
            )}
          </h4>
          <AnnotationPlayback
            videoUrl={result.recording_download_url}
            annotationsUrl={result.annotations_download_url}
          />
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-text-primary mb-1">
          Step Results
          <span className="text-xs font-normal text-text-muted ml-2">
            {result.steps_passed} passed, {result.steps_failed} failed of {result.steps_total}
          </span>
        </h4>
        <div className="space-y-2">
          {(result.per_step_results || []).map((sr) => (
            <div key={sr.step_index} className="border border-border rounded-lg p-4 bg-surface">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Step {sr.step_index + 1}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                      sr.status === 'passed' ? 'bg-accent-review/10 text-accent-review'
                        : sr.status === 'failed' ? 'bg-accent-danger/10 text-accent-danger'
                        : 'bg-text-muted/10 text-text-muted'
                    }`}>
                      {sr.status}
                    </span>
                    {sr.severity && (
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${SEVERITY_STYLES[sr.severity]?.badge || ''}`}>
                        {sr.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-primary">{sr.instruction}</p>
                  {sr.actual_behavior && (
                    <p className="mt-1 text-[13px] text-accent-danger">Actual: {sr.actual_behavior}</p>
                  )}
                  {sr.notes && (
                    <p className="mt-1 text-[13px] text-text-muted">{sr.notes}</p>
                  )}
                </div>
              </div>
              {(sr.screenshot_download_url || sr.screenshot_url) && (
                <div className="mt-3">
                  <img src={sr.screenshot_download_url || sr.screenshot_url} alt={`Step ${sr.step_index + 1} screenshot`}
                    className="rounded-lg border border-border max-w-full max-h-64 object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ReviewResults({ result }: { result: ReviewTestResult }) {
  return (
    <>
      {result.credits_breakdown && (
        <div className="flex items-center gap-3 text-xs text-text-muted font-mono">
          <span>Base: {result.credits_breakdown.base}</span>
          <span>+</span>
          <span>Bonus: {result.credits_breakdown.bonus}</span>
          <span>=</span>
          <span className="font-semibold text-text-primary">{result.credits_breakdown.total} total</span>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-text-primary mb-1">
          Findings
          <span className="text-xs font-normal text-text-muted ml-2">{result.total_findings} reported</span>
        </h4>
        <div className="space-y-2">
          {(result.findings || []).map((f) => {
            const sev = SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.minor;
            return (
              <div key={f.id} className={`border border-border rounded-lg p-4 bg-surface border-l-[3px] ${sev.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${sev.badge}`}>
                    {f.severity}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] ${CATEGORY_STYLES[f.category] || 'bg-text-muted/10 text-text-muted'}`}>
                    {f.category}
                  </span>
                  <span className="text-[11px] text-text-muted font-mono ml-auto">{f.device}</span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{f.description}</p>
                <p className="text-[11px] text-text-muted font-mono mt-1">{f.location}</p>
                {f.screenshot_url && (
                  <div className="mt-3">
                    <img src={f.screenshot_url} alt="Finding screenshot"
                      className="rounded-lg border border-border max-w-full max-h-64 object-contain" />
                  </div>
                )}
              </div>
            );
          })}
          {result.findings.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No issues found.</p>
          )}
        </div>
      </div>
    </>
  );
}

export function TestResultView({ result }: { result: TestResult }) {
  const verdict = result.verdict || 'blocked';

  return (
    <div className="space-y-5">
      <div className={`border rounded-lg p-5 ${VERDICT_STYLES[verdict] || VERDICT_STYLES.blocked}`}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">{VERDICT_LABELS[verdict] || verdict}</span>
          {result.completed_at && (
            <span className="text-[13px] opacity-75">Completed {new Date(result.completed_at).toLocaleString()}</span>
          )}
        </div>
        {result.summary && <p className="mt-2 text-sm opacity-90">{result.summary}</p>}
      </div>

      {result.template_type === 'flow_test' ? (
        <FlowResults result={result as FlowTestResult} />
      ) : (
        <ReviewResults result={result as ReviewTestResult} />
      )}
    </div>
  );
}
