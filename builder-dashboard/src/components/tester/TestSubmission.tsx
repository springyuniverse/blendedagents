'use client';

import { useState } from 'react';
import { testerApi, type StepResultData } from '@/lib/tester-api';

interface TestSubmissionProps {
  taskId: string;
  stepResults: StepResultData[];
  isRecording: boolean;
  onStopRecording: () => Promise<string | null>;
  onSubmitComplete: () => void;
}

export function TestSubmission({ taskId, stepResults, isRecording, onStopRecording, onSubmitComplete }: TestSubmissionProps) {
  const [verdict, setVerdict] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const failedSteps = stepResults.filter((r) => r.status === 'failed').length;
  const blockedSteps = stepResults.filter((r) => r.status === 'blocked').length;
  const passedSteps = stepResults.filter((r) => r.status === 'passed').length;
  const totalSteps = stepResults.length;

  const suggestedVerdict =
    blockedSteps === totalSteps ? 'blocked'
    : failedSteps > 0 && passedSteps > 0 ? 'partial'
    : failedSteps > 0 ? 'fail'
    : 'pass';

  const handleSubmit = async () => {
    const selectedVerdict = verdict || suggestedVerdict;

    if (!summary.trim()) { setError('Summary is required'); return; }
    if (summary.trim().length < 10) { setError('Summary must be at least 10 characters'); return; }

    setError(null);
    setIsSubmitting(true);

    try {
      // Always consult the recording hook — if a recording is active it will
      // be finalized and uploaded; if it was already stopped earlier in the
      // session, the hook returns the cached key from the previous upload.
      // Either way this is how we learn the S3 key for the submit payload.
      let recording_url: string | undefined;
      try {
        const key = await onStopRecording();
        if (key) recording_url = key;
      } catch { /* non-blocking */ }

      await testerApi.submitTest(taskId, {
        verdict: selectedVerdict,
        summary: summary.trim(),
        recording_url,
      });
      onSubmitComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg shadow-soft p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Submit Test Results</h3>

      <div className="mb-4 flex items-center gap-3 text-xs">
        <span className="text-accent-review font-medium">{passedSteps} passed</span>
        <span className="text-accent-danger font-medium">{failedSteps} failed</span>
        <span className="text-accent-warning font-medium">{blockedSteps} blocked</span>
        <span className="text-text-muted font-medium">{totalSteps - passedSteps - failedSteps - blockedSteps} skipped</span>
      </div>

      {isRecording && (
        <div className="mb-4 flex items-center gap-2 text-xs text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-lg px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-danger/75 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-danger" />
          </span>
          Recording will be stopped and saved when you submit.
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs font-semibold text-text-primary mb-2">Verdict</label>
        <div className="flex items-center gap-2">
          {[
            { value: 'pass', label: 'Pass', color: 'border-accent-review/30 bg-accent-review/10 text-accent-review' },
            { value: 'fail', label: 'Fail', color: 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger' },
            { value: 'partial', label: 'Partial', color: 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning' },
            { value: 'blocked', label: 'Blocked', color: 'border-border bg-surface-secondary text-text-primary' },
          ].map((option) => {
            const isSelected = (verdict || suggestedVerdict) === option.value;
            return (
              <button key={option.value} onClick={() => setVerdict(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isSelected ? `${option.color} ring-1 ring-offset-1 ring-offset-surface` : 'border-border bg-surface text-text-secondary hover:bg-surface-secondary'}`}>
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-text-primary mb-1">Summary (1-3 sentences) *</label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder="Summarize the overall test results..."
          className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent-review/50 focus:border-accent-review/50"
          rows={3} maxLength={1000} />
        <p className="text-xs text-text-muted mt-1">{summary.length}/1000</p>
      </div>

      {error && (
        <div className="mb-4 text-xs text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-lg p-2">{error}</div>
      )}

      <button onClick={handleSubmit} disabled={isSubmitting || !summary.trim()}
        className="w-full bg-accent-review hover:bg-accent-review/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        {isSubmitting ? 'Submitting...' : 'Submit Test'}
      </button>
    </div>
  );
}
