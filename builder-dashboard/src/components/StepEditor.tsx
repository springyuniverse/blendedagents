'use client';

import { useCallback } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

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
        <label className="block text-sm font-semibold text-text-primary">
          Steps ({steps.length})
        </label>
        <span className="text-xs text-text-muted font-mono">
          Estimated cost: {2 + steps.length} credits
        </span>
      </div>

      {steps.map((step, index) => (
        <div key={index} className="border border-border rounded-lg p-4 bg-surface-secondary">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider bg-surface border border-border rounded px-2 py-0.5">
              Step {index + 1}
            </span>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => moveStep(index, 'up')} disabled={index === 0}
                className="p-1 text-text-muted hover:text-text-secondary disabled:opacity-20" title="Move up">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}
                className="p-1 text-text-muted hover:text-text-secondary disabled:opacity-20" title="Move down">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => removeStep(index)}
                className="p-1 text-text-muted hover:text-accent-danger" title="Remove step">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="What should the tester do?"
              value={step.instruction}
              onChange={(e) => updateStep(index, 'instruction', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50"
            />
            <input
              type="text"
              placeholder="Expected behavior (optional)"
              value={step.expected_behavior}
              onChange={(e) => updateStep(index, 'expected_behavior', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addStep}
        className="w-full py-2.5 border-2 border-dashed border-border rounded-lg text-sm text-text-muted hover:border-accent-flow/50 hover:text-accent-flow transition-colors"
      >
        + Add Step
      </button>
    </div>
  );
}
