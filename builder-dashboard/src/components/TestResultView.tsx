'use client';

import type { TestResult } from '@/lib/api';

const VERDICT_STYLES: Record<string, string> = {
  pass: 'bg-green-50 text-green-700 border-green-200',
  fail: 'bg-red-50 text-red-700 border-red-200',
  partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  blocked: 'bg-gray-100 text-gray-700 border-gray-200',
};

const VERDICT_LABELS: Record<string, string> = {
  pass: 'Passed',
  fail: 'Failed',
  partial: 'Partial',
  blocked: 'Blocked',
};

export function TestResultView({ result }: { result: TestResult }) {
  return (
    <div className="space-y-6">
      {/* Verdict */}
      <div className={`border rounded-lg p-5 ${VERDICT_STYLES[result.verdict] || VERDICT_STYLES.blocked}`}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">
            {VERDICT_LABELS[result.verdict] || result.verdict}
          </span>
          <span className="text-sm opacity-75">
            Completed {new Date(result.completed_at).toLocaleString()}
          </span>
        </div>
        {result.summary && (
          <p className="mt-2 text-sm opacity-90">{result.summary}</p>
        )}
      </div>

      {/* Step Results */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Step Results</h4>
        <div className="space-y-3">
          {result.step_results.map((sr) => (
            <div key={sr.step_index} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      Step {sr.step_index + 1}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        sr.status === 'pass'
                          ? 'bg-green-50 text-green-700'
                          : sr.status === 'fail'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sr.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{sr.instruction}</p>
                  {sr.notes && (
                    <p className="mt-1 text-sm text-gray-500">{sr.notes}</p>
                  )}
                </div>
              </div>

              {sr.screenshot_url && (
                <div className="mt-3">
                  <img
                    src={sr.screenshot_url}
                    alt={`Step ${sr.step_index + 1} screenshot`}
                    className="rounded-md border border-gray-200 max-w-full max-h-64 object-contain"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
