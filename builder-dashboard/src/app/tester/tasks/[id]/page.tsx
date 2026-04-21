'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { testerApi, type TaskDetail, type StepResultData } from '@/lib/tester-api';
import { StepResult } from '@/components/tester/StepResult';
import { TestSubmission } from '@/components/tester/TestSubmission';
import { TestResultView } from '@/components/TestResultView';
import { useScreenRecording } from '@/hooks/useScreenRecording';

const COMPLETED_STATUSES = new Set(['completed', 'submitted']);

function CredentialsPanel({ credentials }: { credentials: Record<string, string> }) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-accent-warning">Test Credentials</h4>
        <button onClick={() => setVisible(!visible)} className="text-xs text-accent-warning hover:text-accent-warning/80 underline">
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {visible && (
        <div className="space-y-1.5">
          {Object.entries(credentials).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="text-accent-warning font-medium min-w-[80px]">{key}:</span>
              <code className="bg-accent-warning/20 px-2 py-0.5 rounded text-text-primary text-xs font-mono select-all">{value}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordingToggle({ isRecording, isUploading, onStart, onStop }: { isRecording: boolean; isUploading: boolean; onStart: () => void; onStop: () => void }) {
  if (isRecording) {
    return (
      <button onClick={onStop}
        className="flex items-center gap-2 px-3 py-1.5 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-xs font-medium rounded-lg hover:bg-accent-danger/20 transition-colors">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        Stop Recording
      </button>
    );
  }
  if (isUploading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 px-3 py-1.5 bg-accent-warning/10 border border-accent-warning/20 text-accent-warning text-xs font-medium rounded-lg cursor-wait"
      >
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        Uploading recording…
      </div>
    );
  }
  return (
    <button onClick={onStart}
      className="flex items-center gap-2 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-secondary transition-colors">
      <span className="inline-flex rounded-full h-2 w-2 bg-text-muted" />
      Record Screen
    </button>
  );
}

export default function TaskExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const taskId = params.id as string;

  const [completedSteps, setCompletedSteps] = useState<Map<number, StepResultData>>(new Map());
  const [isStarting, setIsStarting] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);

  const { isRecording, isUploading, recordings, startRecording, stopRecording, removeRecording } = useScreenRecording(taskId);

  // Screenshots captured by the extension, waiting to be linked to a step.
  const [pendingScreenshots, setPendingScreenshots] = useState<Array<{ id: string; key: string; thumbUrl: string }>>([]);
  // Screenshots already assigned to steps (step index → array of key + preview).
  const [stepScreenshots, setStepScreenshots] = useState<Map<number, Array<{ key: string; thumbUrl: string }>>>(new Map());

  // Listen for annotated screenshots sent from the browser extension.
  useEffect(() => {
    async function handleExtensionScreenshot(e: MessageEvent) {
      if (e.data?.type !== 'ba:screenshot' || !e.data.dataUrl) return;
      try {
        const blob = await (await fetch(e.data.dataUrl)).blob();
        const filename = `screenshot-${Date.now()}.png`;
        const { upload_url, key } = await testerApi.getPresignedUrl({
          type: 'screenshot',
          test_case_id: taskId,
          filename,
          content_type: 'image/png',
        });
        await fetch(upload_url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/png' },
        });
        setPendingScreenshots((prev) => [...prev, {
          id: `ss_${Date.now()}`,
          key,
          thumbUrl: e.data.dataUrl,
        }]);
      } catch (err) {
        console.error('Failed to upload extension screenshot:', err);
      }
    }
    window.addEventListener('message', handleExtensionScreenshot);
    return () => window.removeEventListener('message', handleExtensionScreenshot);
  }, [taskId]);

  const assignScreenshot = useCallback((screenshotId: string, stepIndex: number) => {
    const ss = pendingScreenshots.find((s) => s.id === screenshotId);
    if (!ss) return;
    setStepScreenshots((prev) => {
      const next = new Map(prev);
      const existing = next.get(stepIndex) ?? [];
      next.set(stepIndex, [...existing, { key: ss.key, thumbUrl: ss.thumbUrl }]);
      return next;
    });
    setPendingScreenshots((prev) => prev.filter((s) => s.id !== screenshotId));
  }, [pendingScreenshots]);

  const dismissScreenshot = useCallback((screenshotId: string) => {
    setPendingScreenshots((prev) => prev.filter((s) => s.id !== screenshotId));
  }, []);

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['tester-task', taskId],
    queryFn: () => testerApi.getTask(taskId),
  });

  const isAssessment = task?.type === 'onboarding_assessment';
  const isCompleted = task ? COMPLETED_STATUSES.has(task.status) : false;
  const isNeedsInfo = task?.status === 'needs_info';

  const { data: completedResult } = useQuery({
    queryKey: ['tester-task-result', taskId],
    queryFn: () => testerApi.getTaskResult(taskId),
    enabled: isCompleted && !isAssessment,
  });

  const initializeStepResults = useCallback(
    (taskData: TaskDetail) => {
      if (taskData.step_results.length > 0 && completedSteps.size === 0) {
        const map = new Map<number, StepResultData>();
        for (const sr of taskData.step_results) { map.set(sr.step_index, sr); }
        setCompletedSteps(map);
      }
    },
    [completedSteps.size],
  );

  if (task && completedSteps.size === 0 && task.step_results.length > 0) {
    initializeStepResults(task);
  }

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await testerApi.startTask(taskId);
      queryClient.invalidateQueries({ queryKey: ['tester-task', taskId] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start test');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStepComplete = (stepIndex: number, result: StepResultData) => {
    setCompletedSteps((prev) => { const next = new Map(prev); next.set(stepIndex, result); return next; });
  };

  const handleSubmitComplete = async () => {
    router.push('/tester/tasks');
  };

  if (isLoading) return <div className="text-sm text-text-secondary py-8 text-center">Loading task...</div>;

  if (error) {
    return (
      <div className="bg-accent-danger/10 border border-accent-danger/20 rounded-lg p-4 text-sm text-accent-danger">
        Failed to load task: {error.message}
      </div>
    );
  }

  if (!task) return <div className="text-sm text-text-secondary py-8 text-center">Task not found</div>;

  // A step counts as truly done if it has a result that isn't missing_info
  const isStepDone = (i: number) => {
    const r = completedSteps.get(i);
    return r != null && r.status !== 'missing_info';
  };
  const allStepsCompleted = task.steps.length > 0 && task.steps.every((_, i) => isStepDone(i));
  const isStarted = task.status === 'in_progress';
  const currentStepIndex = task.steps.findIndex((_, i) => !isStepDone(i));

  // Assessment tasks: redirect away on completion — no results shown to tester
  if (isCompleted && isAssessment) {
    router.replace('/tester/tasks');
    return <div className="text-sm text-text-secondary py-8 text-center">Redirecting...</div>;
  }

  if (isCompleted) {
    return (
      <div>
        <div className="mb-6">
          <button onClick={() => router.push('/tester/tasks')}
            className="text-sm text-text-secondary hover:text-text-primary mb-3 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Tasks
          </button>
          <h2 className="text-xl font-semibold text-text-primary">{task.title}</h2>
          {task.description && <p className="text-sm text-text-secondary mt-1">{task.description}</p>}
        </div>

        {completedResult ? (
          <TestResultView result={completedResult} />
        ) : (
          <div className="text-sm text-text-secondary py-8 text-center">Loading results...</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.push('/tester/tasks')}
          className="text-sm text-text-secondary hover:text-text-primary mb-3 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Tasks
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{task.title}</h2>
            {task.description && <p className="text-sm text-text-secondary mt-1">{task.description}</p>}
          </div>
          {isStarted && (
            <RecordingToggle
              isRecording={isRecording}
              isUploading={isUploading}
              onStart={() => startRecording().catch(() => {})}
              onStop={() => stopRecording().catch(() => {})}
            />
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
          {task.url && (
            <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-accent-review hover:text-accent-review/80 underline">
              Staging URL
            </a>
          )}
          {task.environment && <span>{task.environment}</span>}
          {task.expected_behavior && <span className="text-text-muted">Expected: {task.expected_behavior}</span>}
        </div>
      </div>

      {!isStarted && !isNeedsInfo && (
        <div className="mb-6">
          <div className="bg-accent-review/10 border border-accent-review/20 rounded-lg p-4">
            <p className="text-sm text-accent-review mb-3">
              Click &quot;Start Test&quot; to reveal credentials and begin testing.
              {task.has_credentials ? ' Credentials will be shown after starting.' : ''}
            </p>
            <button onClick={handleStart} disabled={isStarting}
              className="bg-accent-review text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-review/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {isStarting ? 'Starting...' : 'Start Test'}
            </button>
          </div>
        </div>
      )}

      {(isStarted || isNeedsInfo) && task.credentials && (
        <div className="mb-6">
          <CredentialsPanel credentials={task.credentials} />
        </div>
      )}

      {/* Info requests thread */}
      {task.info_requests && task.info_requests.length > 0 && (
        <div className="mb-6 bg-surface border border-orange-500/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-orange-500 mb-3">Info Requests</h4>
          <div className="space-y-2">
            {task.info_requests.map((req: { from: string; message: string; at: string }, i: number) => (
              <div key={i} className={`flex gap-3 ${req.from === 'tester' ? 'justify-end' : ''}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  req.from === 'tester'
                    ? 'bg-orange-500/10 text-text-primary'
                    : 'bg-accent-flow/10 text-text-primary'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{req.from === 'tester' ? 'You' : 'Builder'}</span>
                    <span className="text-xs text-text-muted">{new Date(req.at).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{req.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs info waiting state */}
      {isNeedsInfo && (
        <div className="mb-6 bg-orange-500/5 border border-orange-500/20 rounded-lg p-4 text-center">
          <p className="text-sm text-orange-500 font-medium">Waiting for builder to respond</p>
          <p className="text-xs text-text-secondary mt-1">You&apos;ll get an email when the builder provides the requested info. The test will resume automatically.</p>
        </div>
      )}

      {isStarted && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 bg-surface-secondary rounded-full h-1.5">
            <div className="bg-accent-review h-1.5 rounded-full transition-all"
              style={{ width: `${(task.steps.filter((_, i) => isStepDone(i)).length / task.steps.length) * 100}%` }} />
          </div>
          <span className="text-xs text-text-secondary whitespace-nowrap">{task.steps.filter((_, i) => isStepDone(i)).length}/{task.steps.length} steps</span>
        </div>
      )}

      {!isRecording && recordings.length > 0 && (
        <div className="mb-4 space-y-3">
          {recordings.map((rec, i) => (
            <div key={rec.id} className="bg-surface border border-border rounded-lg shadow-soft overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs font-medium text-text-primary flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-accent-review" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                  </svg>
                  Recording {recordings.length > 1 ? `${i + 1} of ${recordings.length}` : 'Preview'}
                </span>
                <div className="flex items-center gap-2">
                  {rec.key === null && isUploading && (
                    <span className="text-[11px] text-accent-warning flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Uploading...
                    </span>
                  )}
                  {rec.key && (
                    <span className="text-[11px] text-accent-review flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Saved
                    </span>
                  )}
                  <button
                    onClick={() => removeRecording(rec.id)}
                    className="text-text-muted hover:text-accent-danger p-1 rounded transition-colors"
                    title="Remove this recording"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <video src={rec.previewUrl} controls className="w-full block" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {task.steps.map((step, index) => (
          <StepResult
            key={index}
            stepIndex={index}
            instruction={step.instruction}
            expected={step.expected}
            taskId={taskId}
            isActive={isStarted && index === currentStepIndex}
            isCompleted={isStepDone(index)}
            result={completedSteps.get(index)}
            disabled={!isStarted || (index !== currentStepIndex && !isStepDone(index))}
            extensionScreenshots={stepScreenshots.get(index) ?? null}
            onComplete={handleStepComplete}
          />
        ))}
      </div>

      {isStarted && allStepsCompleted && !showSubmission && (
        <div className="mt-6">
          <button onClick={() => setShowSubmission(true)}
            className="w-full bg-accent-review text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-accent-review/90 transition-colors">
            Complete Test
          </button>
        </div>
      )}

      {showSubmission && (
        <div className="mt-6">
          <TestSubmission
            taskId={taskId}
            stepResults={Array.from(completedSteps.values())}
            isRecording={isRecording}
            onStopRecording={stopRecording}
            onSubmitComplete={handleSubmitComplete}
          />
        </div>
      )}

      {pendingScreenshots.length > 0 && task && (
        <CaptureTray
          screenshots={pendingScreenshots}
          steps={task.steps}
          completedSteps={completedSteps}
          onAssign={assignScreenshot}
          onDismiss={dismissScreenshot}
        />
      )}
    </div>
  );
}

function CaptureTray({
  screenshots,
  steps,
  completedSteps,
  onAssign,
  onDismiss,
}: {
  screenshots: Array<{ id: string; key: string; thumbUrl: string }>;
  steps: Array<{ instruction: string }>;
  completedSteps: Map<number, StepResultData>;
  onAssign: (screenshotId: string, stepIndex: number) => void;
  onDismiss: (screenshotId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(screenshots[screenshots.length - 1]?.id ?? null);
  const [stepIndex, setStepIndex] = useState<number>(0);

  const selected = screenshots.find((s) => s.id === selectedId);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-surface border border-border rounded-lg shadow-lifted w-80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-primary">
          {screenshots.length} capture{screenshots.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => screenshots.forEach((s) => onDismiss(s.id))}
          className="text-[11px] text-text-muted hover:text-text-secondary"
        >
          Dismiss all
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto">
        {screenshots.map((ss) => (
          <button
            key={ss.id}
            onClick={() => setSelectedId(ss.id)}
            className={`relative flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${
              selectedId === ss.id ? 'border-accent-review ring-1 ring-accent-review/30' : 'border-border hover:border-text-muted'
            }`}
          >
            <img src={ss.thumbUrl} alt="" className="w-full h-full object-cover object-top" />
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(ss.id); }}
              className="absolute top-0 right-0 p-0.5 bg-black/60 rounded-bl text-white/80 hover:text-white"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </button>
        ))}
      </div>

      {/* Assignment */}
      {selected && (
        <div className="px-3 pb-3 flex gap-2">
          <select
            value={stepIndex}
            onChange={(e) => setStepIndex(Number(e.target.value))}
            className="flex-1 min-w-0 bg-surface-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary truncate"
          >
            {steps.map((step, i) => (
              <option key={i} value={i}>
                Step {i + 1}{completedSteps.has(i) ? ' ✓' : ''} — {step.instruction.slice(0, 30)}
              </option>
            ))}
          </select>
          <button
            onClick={() => { onAssign(selected.id, stepIndex); setSelectedId(screenshots.find((s) => s.id !== selected.id)?.id ?? null); }}
            className="flex-shrink-0 px-3 py-1.5 bg-accent-review text-white text-xs font-medium rounded-lg hover:bg-accent-review/90 transition-colors"
          >
            Attach
          </button>
        </div>
      )}
    </div>
  );
}
