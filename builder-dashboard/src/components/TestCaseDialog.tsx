'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTestCase, getTestResults, cancelTestCase } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { TestResultView } from '@/components/TestResultView';
import { X } from 'lucide-react';

export function TestCaseDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const canCancel = testCase && ['queued', 'assigned'].includes(testCase.status);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center pt-16 pb-8 px-4 overflow-y-auto"
    >
      <div className="bg-surface rounded-xl shadow-lifted border border-border w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-5 bg-surface-secondary rounded w-2/3 mb-2" />
                <div className="h-3 bg-surface-secondary rounded w-1/3" />
              </div>
            ) : testCase ? (
              <>
                <h2 className="text-base font-semibold text-text-primary truncate">{testCase.title}</h2>
                {testCase.description && (
                  <p className="text-[13px] text-text-muted mt-0.5 line-clamp-2">{testCase.description}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-text-muted">Test case not found</p>
            )}
          </div>
          <button onClick={onClose} className="ml-4 p-1.5 text-text-muted hover:text-text-secondary hover:bg-surface-secondary rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 animate-pulse space-y-3">
            <div className="h-4 bg-surface-secondary rounded w-1/2" />
            <div className="h-20 bg-surface-secondary rounded" />
          </div>
        ) : testCase ? (
          <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={testCase.status} />
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                testCase.template_type === 'review_test' ? 'bg-accent-review/10 text-accent-review' : 'bg-accent-flow/10 text-accent-flow'
              }`}>
                {testCase.template_type === 'review_test' ? 'Review' : 'Flow'}
              </span>
              {testCase.template_type === 'flow_test' && testCase.steps && (
                <span className="text-xs text-text-muted">{testCase.steps.length} steps</span>
              )}
              <span className="text-xs text-text-muted font-mono">{testCase.credit_cost} credits</span>
              <span className="text-xs text-text-muted">{new Date(testCase.created_at).toLocaleString()}</span>
              {canCancel && (
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="ml-auto px-2.5 py-1 border border-accent-danger/30 text-accent-danger text-xs rounded-lg hover:bg-accent-danger/10 disabled:opacity-50 transition-colors"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Test'}
                </button>
              )}
            </div>

            {/* Tags */}
            {testCase.tags && testCase.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {testCase.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-accent-flow/10 text-accent-flow text-[11px] rounded font-medium">{tag}</span>
                ))}
              </div>
            )}

            {/* Status Timeline */}
            {testCase.status_history && testCase.status_history.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Timeline</h3>
                <div className="space-y-1.5">
                  {testCase.status_history.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                      <StatusBadge status={entry.status} />
                      <span className="text-xs text-text-muted">{new Date(entry.at ?? entry.timestamp ?? '').toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps (flow test) */}
            {testCase.template_type === 'flow_test' && testCase.steps && testCase.steps.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Steps</h3>
                <div className="space-y-2">
                  {testCase.steps.map((step, i) => (
                    <div key={i} className="flex gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-secondary text-[11px] font-semibold text-text-muted flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{step.instruction}</p>
                        {step.expected_behavior && (
                          <p className="text-xs text-text-muted mt-0.5">Expected: {step.expected_behavior}</p>
                        )}
                      </div>
                      {step.status && <StatusBadge status={step.status} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context & details (review test) */}
            {testCase.template_type === 'review_test' && (
              <div className="space-y-3">
                {testCase.context && (
                  <div>
                    <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Context</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{testCase.context}</p>
                  </div>
                )}
                {testCase.devices_to_check && testCase.devices_to_check.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Devices</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {testCase.devices_to_check.map((d) => (
                        <span key={d} className="px-2 py-0.5 bg-accent-review/10 text-accent-review text-[11px] rounded">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {results && (
              <div>
                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Results</h3>
                <TestResultView result={results} />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
