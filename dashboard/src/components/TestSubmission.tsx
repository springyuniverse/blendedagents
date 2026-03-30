'use client';

import { useState } from 'react';
import { api, type StepResultData } from '@/lib/api';

interface TestSubmissionProps {
  taskId: string;
  stepResults: StepResultData[];
  onSubmitComplete: () => void;
}

export function TestSubmission({ taskId, stepResults, onSubmitComplete }: TestSubmissionProps) {
  const [verdict, setVerdict] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggest verdict based on step results
  const failedSteps = stepResults.filter((r) => r.status === 'failed').length;
  const blockedSteps = stepResults.filter((r) => r.status === 'blocked').length;
  const passedSteps = stepResults.filter((r) => r.status === 'passed').length;
  const totalSteps = stepResults.length;

  const suggestedVerdict =
    blockedSteps === totalSteps
      ? 'blocked'
      : failedSteps > 0 && passedSteps > 0
        ? 'partial'
        : failedSteps > 0
          ? 'fail'
          : 'pass';

  const handleSubmit = async () => {
    const selectedVerdict = verdict || suggestedVerdict;

    if (!summary.trim()) {
      setError('Summary is required');
      return;
    }

    if (summary.trim().length < 10) {
      setError('Summary must be at least 10 characters');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await api.submitTest(taskId, {
        verdict: selectedVerdict,
        summary: summary.trim(),
      });
      onSubmitComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Submit Test Results</h3>

      {/* Step summary */}
      <div className="mb-4 flex items-center gap-3 text-xs">
        <span className="text-green-600 font-medium">{passedSteps} passed</span>
        <span className="text-red-600 font-medium">{failedSteps} failed</span>
        <span className="text-yellow-600 font-medium">{blockedSteps} blocked</span>
        <span className="text-gray-400 font-medium">
          {totalSteps - passedSteps - failedSteps - blockedSteps} skipped
        </span>
      </div>

      {/* Verdict selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Verdict</label>
        <div className="flex items-center gap-2">
          {[
            { value: 'pass', label: 'Pass', color: 'border-green-300 bg-green-50 text-green-700' },
            { value: 'fail', label: 'Fail', color: 'border-red-300 bg-red-50 text-red-700' },
            { value: 'partial', label: 'Partial', color: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
            { value: 'blocked', label: 'Blocked', color: 'border-gray-300 bg-gray-50 text-gray-700' },
          ].map((option) => {
            const isSelected = (verdict || suggestedVerdict) === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setVerdict(option.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  isSelected
                    ? `${option.color} ring-1 ring-offset-1`
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Summary (1-3 sentences) *
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Summarize the overall test results..."
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
          rows={3}
          maxLength={1000}
        />
        <p className="text-xs text-gray-400 mt-1">{summary.length}/1000</p>
      </div>

      {error && (
        <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !summary.trim()}
        className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Test'}
      </button>
    </div>
  );
}
