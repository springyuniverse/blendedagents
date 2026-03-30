'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTestCase, getTestResults, cancelTestCase } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { TestResultView } from '@/components/TestResultView';
import Link from 'next/link';

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
        <div className="h-6 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Test case not found</p>
        <Link href="/test-cases" className="text-sm text-gray-900 hover:underline mt-2 inline-block">
          Back to test cases
        </Link>
      </div>
    );
  }

  const canCancel = ['queued', 'assigned'].includes(testCase.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/test-cases" className="text-sm text-gray-500 hover:text-gray-700">
              Test Cases
            </Link>
            <span className="text-gray-300">/</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{testCase.title}</h1>
          {testCase.description && (
            <p className="text-sm text-gray-500 mt-1">{testCase.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={testCase.status} />
          {canCancel && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex gap-6 text-sm text-gray-500">
        <span>Cost: {testCase.credit_cost} credits</span>
        <span>Steps: {testCase.steps.length}</span>
        <span>Created: {new Date(testCase.created_at).toLocaleString()}</span>
        {testCase.staging_url && (
          <a
            href={testCase.staging_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-900 hover:underline"
          >
            Staging URL
          </a>
        )}
      </div>

      {/* Tags */}
      {testCase.tags && testCase.tags.length > 0 && (
        <div className="flex gap-1.5">
          {testCase.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Status Timeline */}
      {testCase.status_history && testCase.status_history.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Status Timeline</h3>
          <div className="space-y-2">
            {testCase.status_history.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                <StatusBadge status={entry.status} />
                <span className="text-xs text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                {entry.note && <span className="text-xs text-gray-400">{entry.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Steps</h3>
        <div className="space-y-3">
          {testCase.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600 flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{step.instruction}</p>
                {step.expected_behavior && (
                  <p className="text-xs text-gray-500 mt-0.5">Expected: {step.expected_behavior}</p>
                )}
              </div>
              {step.status && <StatusBadge status={step.status} />}
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Results</h3>
          <TestResultView result={results} />
        </div>
      )}
    </div>
  );
}
