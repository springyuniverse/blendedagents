'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { api, type TaskDetail, type StepResultData } from '@/lib/api';
import { StepResult } from '@/components/StepResult';
import { TestSubmission } from '@/components/TestSubmission';
import { useScreenRecording } from '@/hooks/useScreenRecording';

function CredentialsPanel({ credentials }: { credentials: Record<string, string> }) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-amber-900">Test Credentials</h4>
        <button
          onClick={() => setVisible(!visible)}
          className="text-xs text-amber-700 hover:text-amber-900 underline"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {visible && (
        <div className="space-y-1.5">
          {Object.entries(credentials).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="text-amber-700 font-medium min-w-[80px]">{key}:</span>
              <code className="bg-amber-100 px-2 py-0.5 rounded text-amber-900 text-xs font-mono select-all">
                {value}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordingIndicator({ isRecording }: { isRecording: boolean }) {
  if (!isRecording) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-red-600">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      Recording
    </div>
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

  const { isRecording, startRecording, stopRecording } = useScreenRecording(taskId);

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.getTask(taskId),
  });

  // Initialize completed steps from server data
  const initializeStepResults = useCallback(
    (taskData: TaskDetail) => {
      if (taskData.step_results.length > 0 && completedSteps.size === 0) {
        const map = new Map<number, StepResultData>();
        for (const sr of taskData.step_results) {
          map.set(sr.step_index, sr);
        }
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
      await api.startTask(taskId);
      // Try to start recording (P3 feature, non-blocking)
      try {
        await startRecording();
      } catch {
        // Recording is optional, test can proceed without it
      }
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start test');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStepComplete = (stepIndex: number, result: StepResultData) => {
    setCompletedSteps((prev) => {
      const next = new Map(prev);
      next.set(stepIndex, result);
      return next;
    });
  };

  const handleSubmitComplete = async () => {
    try {
      await stopRecording();
    } catch {
      // Recording stop failure is non-blocking
    }
    router.push('/tasks');
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Loading task...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        Failed to load task: {error.message}
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">Task not found</div>
    );
  }

  const allStepsCompleted = task.steps.length > 0 && completedSteps.size >= task.steps.length;
  const isStarted = task.status === 'in_progress';

  // Find the current step (first step without a result)
  const currentStepIndex = task.steps.findIndex(
    (_, i) => !completedSteps.has(i),
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/tasks')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Tasks
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{task.title}</h2>
            {task.description && (
              <p className="text-sm text-gray-500 mt-1">{task.description}</p>
            )}
          </div>
          <RecordingIndicator isRecording={isRecording} />
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          {task.url && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Staging URL
            </a>
          )}
          {task.environment && <span>{task.environment}</span>}
          {task.expected_behavior && (
            <span className="text-gray-400">Expected: {task.expected_behavior}</span>
          )}
        </div>
      </div>

      {/* Start Test Button */}
      {!isStarted && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-3">
              Click &quot;Start Test&quot; to reveal credentials and begin testing.
              {task.has_credentials ? ' Credentials will be shown after starting.' : ''}
            </p>
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isStarting ? 'Starting...' : 'Start Test'}
            </button>
          </div>
        </div>
      )}

      {/* Credentials */}
      {isStarted && task.credentials && (
        <div className="mb-6">
          <CredentialsPanel credentials={task.credentials} />
        </div>
      )}

      {/* Progress */}
      {isStarted && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${(completedSteps.size / task.steps.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {completedSteps.size}/{task.steps.length} steps
          </span>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {task.steps.map((step, index) => (
          <StepResult
            key={index}
            stepIndex={index}
            instruction={step.instruction}
            expected={step.expected}
            taskId={taskId}
            isActive={isStarted && index === currentStepIndex}
            isCompleted={completedSteps.has(index)}
            result={completedSteps.get(index)}
            disabled={!isStarted || (index !== currentStepIndex && !completedSteps.has(index))}
            onComplete={handleStepComplete}
          />
        ))}
      </div>

      {/* Submission */}
      {isStarted && allStepsCompleted && !showSubmission && (
        <div className="mt-6">
          <button
            onClick={() => setShowSubmission(true)}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Complete Test
          </button>
        </div>
      )}

      {showSubmission && (
        <div className="mt-6">
          <TestSubmission
            taskId={taskId}
            stepResults={Array.from(completedSteps.values())}
            onSubmitComplete={handleSubmitComplete}
          />
        </div>
      )}
    </div>
  );
}
