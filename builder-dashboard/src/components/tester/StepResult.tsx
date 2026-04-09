'use client';

import { useState, useEffect } from 'react';
import { testerApi, type StepResultData } from '@/lib/tester-api';
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
  /** Screenshots captured via the browser extension. */
  extensionScreenshots?: Array<{ key: string; thumbUrl: string }> | null;
  onComplete: (stepIndex: number, result: StepResultData) => void;
}

type StepStatus = 'passed' | 'failed' | 'blocked' | 'skipped';

const statusColors: Record<StepStatus, string> = {
  passed: 'border-accent-review/30 bg-accent-review/10',
  failed: 'border-accent-danger/30 bg-accent-danger/10',
  blocked: 'border-accent-warning/30 bg-accent-warning/10',
  skipped: 'border-border bg-surface-secondary',
};

const statusIcons: Record<StepStatus, string> = {
  passed: 'text-accent-review',
  failed: 'text-accent-danger',
  blocked: 'text-accent-warning',
  skipped: 'text-text-muted',
};

export function StepResult({ stepIndex, instruction, expected, taskId, isActive, isCompleted, result, disabled, extensionScreenshots, onComplete }: StepResultProps) {
  const [showFailForm, setShowFailForm] = useState(false);
  const [showSkipForm, setShowSkipForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [severity, setSeverity] = useState<string>('major');
  const [actualBehavior, setActualBehavior] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshots, setScreenshots] = useState<Array<{ key: string; thumbUrl: string }>>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [skipReason, setSkipReason] = useState('');

  // Sync screenshots from the extension into local state.
  useEffect(() => {
    if (extensionScreenshots && extensionScreenshots.length > 0) {
      setScreenshots(extensionScreenshots);
      // Use the last screenshot as the primary submission URL.
      setScreenshotUrl(extensionScreenshots[extensionScreenshots.length - 1].key);
      if (!showFailForm) setShowFailForm(true);
    }
  }, [extensionScreenshots]);

  const handleAction = async (status: StepStatus) => {
    if (status === 'failed') { setShowFailForm(true); setShowSkipForm(false); return; }
    if (status === 'skipped') { setShowSkipForm(true); setShowFailForm(false); return; }

    setIsSubmitting(true);
    try {
      const data: { status: string; screenshot_url?: string } = { status };
      // Attach screenshot if one was captured for this step.
      if (screenshotUrl) data.screenshot_url = screenshotUrl;
      const stepResult = await testerApi.submitStepResult(taskId, stepIndex, data);
      onComplete(stepIndex, { id: stepResult.id, step_index: stepResult.step_index, status: stepResult.status, severity: null, actual_behavior: null, screenshot_url: screenshotUrl || null, notes: null, created_at: stepResult.created_at });
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
      const stepResult = await testerApi.submitStepResult(taskId, stepIndex, { status: 'failed', severity, actual_behavior: actualBehavior, screenshot_url: screenshotUrl, notes: notes || undefined });
      onComplete(stepIndex, { id: stepResult.id, step_index: stepResult.step_index, status: 'failed', severity, actual_behavior: actualBehavior, screenshot_url: screenshotUrl, notes: notes || null, created_at: stepResult.created_at });
      setShowFailForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit step result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipSubmit = async () => {
    if (!skipReason) { alert('A reason is required when skipping a step.'); return; }
    setIsSubmitting(true);
    try {
      const stepResult = await testerApi.submitStepResult(taskId, stepIndex, { status: 'skipped', notes: skipReason });
      onComplete(stepIndex, { id: stepResult.id, step_index: stepResult.step_index, status: 'skipped', severity: null, actual_behavior: null, screenshot_url: null, notes: skipReason, created_at: stepResult.created_at });
      setShowSkipForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit step result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedStatus = result?.status as StepStatus | undefined;

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isCompleted && completedStatus ? statusColors[completedStatus] : isActive ? 'border-accent-review/30 bg-accent-review/10 ring-1 ring-accent-review/20' : 'border-border bg-surface'
    }`}>
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
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-border text-xs text-text-secondary font-medium">
              {stepIndex + 1}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">{instruction}</p>
          {expected && <p className="text-xs text-text-secondary mt-1">Expected: {expected}</p>}

          {isCompleted && result && (
            <div className="mt-2 text-xs text-text-secondary">
              {result.status === 'failed' && (
                <div className="space-y-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-accent-danger/10 text-accent-danger">{result.severity}</span>
                  {result.actual_behavior && <p className="text-text-secondary">{result.actual_behavior}</p>}
                </div>
              )}
              {(result.status === 'skipped' || result.status === 'blocked') && result.notes && (
                <p className="text-text-secondary italic">Reason: {result.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {isActive && !isCompleted && screenshots.length > 0 && !showFailForm && (
        <div className="mt-3 ml-8">
          <div className="flex gap-2 flex-wrap mb-2">
            {screenshots.map((ss, i) => (
              <div key={i} className="relative group">
                <button type="button" onClick={() => setPreviewImage(ss.thumbUrl)}
                  className="w-16 h-11 rounded-md overflow-hidden border-2 border-accent-review/30 hover:border-accent-review/60 cursor-zoom-in">
                  <img src={ss.thumbUrl} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover object-top" />
                </button>
                <button type="button"
                  onClick={() => { const next = screenshots.filter((_, j) => j !== i); setScreenshots(next); setScreenshotUrl(next.length > 0 ? next[next.length - 1].key : ''); }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-surface border border-border rounded-full flex items-center justify-center text-text-muted hover:text-accent-danger opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isActive && !isCompleted && !showFailForm && !showSkipForm && (
        <div className="mt-3 flex items-center gap-2 ml-8">
          <button onClick={() => handleAction('passed')} disabled={isSubmitting || disabled}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-review text-white hover:bg-accent-review/90 disabled:opacity-50 transition-colors">
            Pass
          </button>
          <button onClick={() => handleAction('failed')} disabled={isSubmitting || disabled}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-danger text-white hover:bg-accent-danger/90 disabled:opacity-50 transition-colors">
            Fail
          </button>
          <button onClick={() => handleAction('blocked')} disabled={isSubmitting || disabled}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-warning text-white hover:bg-accent-warning/90 disabled:opacity-50 transition-colors">
            Block
          </button>
          <button onClick={() => handleAction('skipped')} disabled={isSubmitting || disabled}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-text-muted text-white hover:bg-text-secondary disabled:opacity-50 transition-colors">
            Skip
          </button>
        </div>
      )}

      {showFailForm && (
        <div className="mt-3 ml-8 space-y-3 bg-surface border border-accent-danger/20 rounded-lg p-3">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Severity *</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}
              className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary">
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="cosmetic">Cosmetic</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Actual Behavior *</label>
            <textarea value={actualBehavior} onChange={(e) => setActualBehavior(e.target.value)}
              placeholder="Describe what actually happened..."
              className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent-review/50 focus:border-accent-review/50" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Screenshot{screenshots.length > 1 ? 's' : ''} *
              {screenshots.length > 0 && (
                <span className="ml-1 text-[11px] text-accent-review font-normal">({screenshots.length} attached)</span>
              )}
            </label>
            {screenshots.length > 0 ? (
              <div>
                <div className="flex gap-2 flex-wrap mb-2">
                  {screenshots.map((ss, i) => (
                    <div key={i} className="relative group">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(ss.thumbUrl)}
                        className="w-20 h-14 rounded-lg overflow-hidden border-2 border-accent-review/30 hover:border-accent-review/60 transition-colors cursor-zoom-in"
                      >
                        <img src={ss.thumbUrl} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover object-top" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = screenshots.filter((_, j) => j !== i);
                          setScreenshots(next);
                          setScreenshotUrl(next.length > 0 ? next[next.length - 1].key : '');
                        }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-surface border border-border rounded-full flex items-center justify-center text-text-muted hover:text-accent-danger opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <ScreenshotUpload taskId={taskId} onUploadComplete={(key) => { setScreenshotUrl(key); }} />
              </div>
            ) : (
              <ScreenshotUpload taskId={taskId} onUploadComplete={(key) => setScreenshotUrl(key)} />
            )}
          </div>

          {previewImage && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-zoom-out"
              onClick={() => setPreviewImage(null)}
            >
              <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <img
                  src={previewImage}
                  alt="Screenshot preview"
                  className="max-w-full max-h-[85vh] rounded-lg border border-border shadow-2xl object-contain"
                />
                <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-surface border border-border rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary shadow-lifted"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context..."
              className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-review/50 focus:border-accent-review/50" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleFailSubmit} disabled={isSubmitting || !severity || !actualBehavior || !screenshotUrl}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-danger text-white hover:bg-accent-danger/90 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Submitting...' : 'Submit Failure'}
            </button>
            <button onClick={() => setShowFailForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showSkipForm && (
        <div className="mt-3 ml-8 space-y-3 bg-surface border border-border rounded-lg p-3">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Reason *</label>
            <input type="text" value={skipReason} onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Why is this step being skipped?"
              className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-review/50 focus:border-accent-review/50" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSkipSubmit} disabled={isSubmitting || !skipReason}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-text-muted text-white hover:bg-text-secondary disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Submitting...' : 'Skip Step'}
            </button>
            <button onClick={() => setShowSkipForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
