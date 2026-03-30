'use client';

import { useCallback } from 'react';

export interface Step {
  instruction: string;
  expected_behavior: string;
}

interface StepEditorProps {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

export function StepEditor({ steps, onChange }: StepEditorProps) {
  const addStep = useCallback(() => {
    onChange([...steps, { instruction: '', expected_behavior: '' }]);
  }, [steps, onChange]);

  const removeStep = useCallback(
    (index: number) => {
      onChange(steps.filter((_, i) => i !== index));
    },
    [steps, onChange],
  );

  const updateStep = useCallback(
    (index: number, field: keyof Step, value: string) => {
      const updated = steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step,
      );
      onChange(updated);
    },
    [steps, onChange],
  );

  const moveStep = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= steps.length) return;
      const updated = [...steps];
      [updated[index], updated[target]] = [updated[target], updated[index]];
      onChange(updated);
    },
    [steps, onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Steps ({steps.length})
        </label>
        <span className="text-xs text-gray-500">
          Estimated cost: {2 + steps.length} credits
        </span>
      </div>

      {steps.map((step, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded px-2 py-0.5">
              Step {index + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveStep(index, 'up')}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveStep(index, 'down')}
                disabled={index === steps.length - 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeStep(index)}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Remove step"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="What should the tester do?"
              value={step.instruction}
              onChange={(e) => updateStep(index, 'instruction', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
            />
            <input
              type="text"
              placeholder="Expected behavior (optional)"
              value={step.expected_behavior}
              onChange={(e) => updateStep(index, 'expected_behavior', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addStep}
        className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
      >
        + Add Step
      </button>
    </div>
  );
}
