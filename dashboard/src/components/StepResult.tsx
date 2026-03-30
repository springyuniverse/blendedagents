'use client';

import { useState } from 'react';
import { api, type StepResultData } from '@/lib/api';
import { ScreenshotUpload } from './ScreenshotUpload';

interface StepResultProps {
  stepIndex: number;
  instruction: string;
  expected?: string;
  taskId: string;
  isActive: boolean;
  isCompleted: boolean;
  result?: StepResultData;
  disabled: boolean;
  onComplete: (stepIndex: number, result: StepResultData) => void;
}

type StepStatus = 'passed' | 'failed' | 'blocked' | 'skipped';

const statusColors: Record<StepStatus, string> = {
  passed: 'border-green-300 bg-green-50',
  failed: 'border-red-300 bg-red-50',
  blocked: 'border-yellow-300 bg-yellow-50',
  skipped: 'border-gray-300 bg-gray-50',
};

const statusIcons: Record<StepStatus, string> = {
  passed: 'text-green-600',
  failed: 'text-red-600',
  blocked: 'text-yellow-600',
  skipped: 'text-gray-400',
};

export function StepResult({
  stepIndex,
  instruction,
  expected,
  taskId,
  isActive,
  isCompleted,
  result,
  disabled,
  onComplete,
}: StepResultProps) {
  const [showFailForm, setShowFailForm] = useState(false);
  const [showSkipForm, setShowSkipForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fail form state
  const [severity, setSeverity] = useState<string>('major');
  const [actualBehavior, setActualBehavior] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Skip form state
  const [skipReason, setSkipReason] = useState('');

  const handleAction = async (status: StepStatus) => {
    if (status === 'failed') {
      setShowFailForm(true);
      setShowSkipForm(false);
      return;
    }

    if (status === 'skipped') {
      setShowSkipForm(true);
      setShowFailForm(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const stepResult = await api.submitStepResult(taskId, stepIndex, { status });
      onComplete(stepIndex, {
        id: stepResult.id,
        step_index: stepResult.step_index,
        status: stepResult.status,
        severity: null,
        actual_behavior: null,
        screenshot_url: null,
        notes: null,
        created_at: stepResult.created_at,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit step result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailSubmit = async () => {
    if (!severity || !actualBehavior || !screenshotUrl) {
      alert('Severity, actual behavior, and screenshot are required for failed steps.');
      return;
    }

    setIsSubmitting(true);
    try {
      const stepResult = await api.submitStepResult(taskId, stepIndex, {
        status: 'failed',
        severity,
        actual_behavior: actualBehavior,
        screenshot_url: screenshotUrl,
        notes: notes || undefined,
      });
      onComplete(stepIndex, {
        id: stepResult.id,
        step_index: stepResult.step_index,
        status: 'failed',
        severity,
        actual_behavior: actualBehavior,
        screenshot_url: screenshotUrl,
        notes: notes || null,
        created_at: stepResult.created_at,
      });
      setShowFailForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit step result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipSubmit = async () => {
    if (!skipReason) {
      alert('A reason is required when skipping a step.');
      return;
    }

    setIsSubmitting(true);
    try {
      const stepResult = await api.submitStepResult(taskId, stepIndex, {
        status: 'skipped',
        notes: skipReason,
      });
      onComplete(stepIndex, {
        id: stepResult.id,
        step_index: stepResult.step_index,
        status: 'skipped',
        severity: null,
        actual_behavior: null,
        screenshot_url: null,
        notes: skipReason,
        created_at: stepResult.created_at,
      });
      setShowSkipForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit step result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedStatus = result?.status as StepStatus | undefined;

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isCompleted && completedStatus
          ? statusColors[completedStatus]
          : isActive
            ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
            : 'border-gray-200 bg-white'
      }`}
    >
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isCompleted && completedStatus ? (
            <span className={`text-sm font-medium ${statusIcons[completedStatus]}`}>
              {completedStatus === 'passed' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
              {completedStatus === 'failed' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {completedStatus === 'blocked' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              )}
              {completedStatus === 'skipped' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
                </svg>
              )}
            </span>
          ) : (
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-xs text-gray-500 font-medium">
              {stepIndex + 1}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">{instruction}</p>
          {expected && (
            <p className="text-xs text-gray-500 mt-1">Expected: {expected}</p>
          )}

          {/* Completed result summary */}
          {isCompleted && result && (
            <div className="mt-2 text-xs text-gray-600">
              {result.status === 'failed' && (
                <div className="space-y-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                    {result.severity}
                  </span>
                  {result.actual_behavior && (
                    <p className="text-gray-600">{result.actual_behavior}</p>
                  )}
                </div>
              )}
              {result.status === 'skipped' && result.notes && (
                <p className="text-gray-500 italic">Reason: {result.notes}</p>
              )}
              {result.status === 'blocked' && result.notes && (
                <p className="text-gray-500 italic">Reason: {result.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {isActive && !isCompleted && !showFailForm && !showSkipForm && (
        <div className="mt-3 flex items-center gap-2 ml-8">
          <button
            onClick={() => handleAction('passed')}
            disabled={isSubmitting || disabled}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Pass
          </button>
          <button
            onClick={() => handleAction('failed')}
            disabled={isSubmitting || disabled}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Fail
          </button>
          <button
            onClick={() => handleAction('blocked')}
            disabled={isSubmitting || disabled}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors"
          >
            Block
          </button>
          <button
            onClick={() => handleAction('skipped')}
            disabled={isSubmitting || disabled}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-400 text-white hover:bg-gray-500 disabled:opacity-50 transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      {/* Fail form */}
      {showFailForm && (
        <div className="mt-3 ml-8 space-y-3 bg-white border border-red-200 rounded-lg p-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Severity *</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white"
            >
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="cosmetic">Cosmetic</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Actual Behavior *
            </label>
            <textarea
              value={actualBehavior}
              onChange={(e) => setActualBehavior(e.target.value)}
              placeholder="Describe what actually happened..."
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Screenshot *</label>
            <ScreenshotUpload
              taskId={taskId}
              onUploadComplete={(key) => setScreenshotUrl(key)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context..."
              className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFailSubmit}
              disabled={isSubmitting || !severity || !actualBehavior || !screenshotUrl}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Failure'}
            </button>
            <button
              onClick={() => setShowFailForm(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Skip form */}
      {showSkipForm && (
        <div className="mt-3 ml-8 space-y-3 bg-white border border-gray-200 rounded-lg p-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason *</label>
            <input
              type="text"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Why is this step being skipped?"
              className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkipSubmit}
              disabled={isSubmitting || !skipReason}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Skip Step'}
            </button>
            <button
              onClick={() => setShowSkipForm(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
