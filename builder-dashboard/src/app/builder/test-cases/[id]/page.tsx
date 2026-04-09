'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTestCase, getTestResults, cancelTestCase } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { TestResultView } from '@/components/TestResultView';
import Link from 'next/link';

const TYPE_LABELS: Record<string, { label: string; style: string }> = {
  flow_test: { label: 'Flow Test', style: 'bg-accent-flow/10 text-accent-flow' },
  review_test: { label: 'Review Test', style: 'bg-accent-review/10 text-accent-review' },
};

export default function TestCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: testCase, isLoading } = useQuery({
    queryKey: ['test-case', id],
    queryFn: () => getTestCase(id),
  });

  const { data: results } = useQuery({
    queryKey: ['test-results', id],
    queryFn: () => getTestResults(id),
    enabled: testCase?.status === 'completed',
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelTestCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case', id] });
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['credit-balance'] });
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-surface-secondary rounded w-1/3" />
        <div className="h-4 bg-surface-secondary rounded w-1/4" />
        <div className="h-32 bg-surface-secondary rounded" />
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-secondary">Test case not found</p>
        <Link href="/builder/test-cases" className="text-sm text-accent-flow hover:text-accent-flow/80 mt-2 inline-block">
          Back to test cases
        </Link>
      </div>
    );
  }

  const canCancel = ['queued', 'assigned'].includes(testCase.status);
  const typeMeta = TYPE_LABELS[testCase.template_type] || TYPE_LABELS.flow_test;
  const isFlow = testCase.template_type === 'flow_test';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/builder/test-cases" className="text-sm text-text-secondary hover:text-text-primary">
              Test Cases
            </Link>
            <span className="text-text-muted">/</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-text-primary">{testCase.title}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeMeta.style}`}>
              {typeMeta.label}
            </span>
          </div>
          {testCase.description && (
            <p className="text-sm text-text-secondary mt-1">{testCase.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={testCase.status} />
          {canCancel && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="px-3 py-1.5 border border-red-500/20 text-accent-danger text-sm rounded-lg hover:bg-accent-danger/10 disabled:opacity-50 transition-colors"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary">
        <span>Cost: {testCase.credit_cost} credits{!isFlow && ' (base)'}</span>
        {isFlow && testCase.steps && <span>Steps: {testCase.steps.length}</span>}
        {!isFlow && testCase.devices_to_check && <span>Devices: {testCase.devices_to_check.join(', ')}</span>}
        <span>Created: {new Date(testCase.created_at).toLocaleString()}</span>
        {testCase.url && (
          <a href={testCase.url} target="_blank" rel="noopener noreferrer" className="text-accent-flow hover:text-accent-flow/80">
            Staging URL
          </a>
        )}
      </div>

      {testCase.tags && testCase.tags.length > 0 && (
        <div className="flex gap-1.5">
          {testCase.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-surface-secondary text-text-secondary text-xs rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {testCase.status_history && testCase.status_history.length > 0 && (
        <div className="bg-surface border border-border rounded-lg shadow-soft p-5">
          <h3 className="text-sm font-medium text-text-primary mb-3">Status Timeline</h3>
          <div className="space-y-2">
            {testCase.status_history.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-text-muted" />
                <StatusBadge status={entry.status} />
                <span className="text-xs text-text-secondary">{new Date(entry.at ?? entry.timestamp ?? '').toLocaleString()}</span>
                {entry.note && <span className="text-xs text-text-muted">{entry.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flow test: Steps */}
      {isFlow && testCase.steps && testCase.steps.length > 0 && (
        <div className="bg-surface border border-border rounded-lg shadow-soft p-5">
          <h3 className="text-sm font-medium text-text-primary mb-1">Steps</h3>
          {testCase.expected_behavior && (
            <p className="text-xs text-text-secondary mb-3">Expected: {testCase.expected_behavior}</p>
          )}
          <div className="space-y-3">
            {testCase.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-secondary text-xs font-medium text-text-secondary flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{step.instruction}</p>
                  {step.expected_behavior && (
                    <p className="text-xs text-text-secondary mt-0.5">Expected: {step.expected_behavior}</p>
                  )}
                </div>
                {step.status && <StatusBadge status={step.status} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review test: Context & details */}
      {!isFlow && (
        <div className="bg-surface border border-border rounded-lg shadow-soft p-5 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-1">Context</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{testCase.context}</p>
          </div>
          {testCase.devices_to_check && testCase.devices_to_check.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-text-secondary mb-1">Devices to check</h4>
              <div className="flex flex-wrap gap-1.5">
                {testCase.devices_to_check.map((d) => (
                  <span key={d} className="px-2 py-0.5 bg-accent-review/10 text-accent-review text-xs rounded-full">{d}</span>
                ))}
              </div>
            </div>
          )}
          {testCase.focus_areas && testCase.focus_areas.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-text-secondary mb-1">Focus areas</h4>
              <div className="flex flex-wrap gap-1.5">
                {testCase.focus_areas.map((a) => (
                  <span key={a} className="px-2 py-0.5 bg-surface-secondary text-text-secondary text-xs rounded-full capitalize">{a}</span>
                ))}
              </div>
            </div>
          )}
          {testCase.ignore_areas && (
            <div>
              <h4 className="text-xs font-medium text-text-secondary mb-1">Ignore</h4>
              <p className="text-sm text-text-secondary">{testCase.ignore_areas}</p>
            </div>
          )}
        </div>
      )}

      {results && (
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Results</h3>
          <TestResultView result={results} />
        </div>
      )}
    </div>
  );
}
