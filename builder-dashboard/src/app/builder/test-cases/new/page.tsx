'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTestCase, type CreateFlowTestInput, type CreateReviewTestInput, type TemplateType } from '@/lib/api';
import { StepEditor, type Step } from '@/components/StepEditor';
import Link from 'next/link';

const DEVICE_OPTIONS = [
  { value: 'desktop_chrome', label: 'Desktop Chrome' },
  { value: 'desktop_firefox', label: 'Desktop Firefox' },
  { value: 'desktop_safari', label: 'Desktop Safari' },
  { value: 'mobile_safari', label: 'Mobile Safari' },
  { value: 'mobile_android', label: 'Mobile Android' },
  { value: 'tablet', label: 'Tablet' },
];

const FOCUS_OPTIONS = ['layout', 'typography', 'forms', 'images', 'content', 'functionality'];

function NewTestCaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const templateParam = searchParams.get('template') as TemplateType | null;
  const [templateType, setTemplateType] = useState<TemplateType>(templateParam || 'flow_test');

  // Shared fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stagingUrl, setStagingUrl] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [externalId, setExternalId] = useState('');
  const [tags, setTags] = useState('');
  const [environment, setEnvironment] = useState('staging');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');

  // Flow test fields
  const [steps, setSteps] = useState<Step[]>([{ instruction: '', expected_behavior: '' }]);
  const [expectedBehavior, setExpectedBehavior] = useState('');

  // Review test fields
  const [context, setContext] = useState('');
  const [devicesToCheck, setDevicesToCheck] = useState<string[]>(['desktop_chrome']);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [ignoreAreas, setIgnoreAreas] = useState('');

  const mutation = useMutation({
    mutationFn: createTestCase,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['credit-balance'] });
      router.push(`/builder/test-cases/${data.id}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create test case');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const shared = {
      ...(description ? { description } : {}),
      ...(environment ? { environment } : {}),
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      ...(externalId ? { external_id: externalId } : {}),
      ...(tags ? { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) } : {}),
    };

    if (templateType === 'flow_test') {
      const validSteps = steps.filter((s) => s.instruction.trim());
      if (validSteps.length === 0) {
        setError('At least one step with an instruction is required');
        return;
      }
      if (!expectedBehavior.trim()) {
        setError('Expected behavior is required');
        return;
      }

      const input: CreateFlowTestInput = {
        template_type: 'flow_test',
        title,
        staging_url: stagingUrl,
        expected_behavior: expectedBehavior,
        steps: validSteps.map((s) => ({
          instruction: s.instruction,
          ...(s.expected_behavior ? { expected_behavior: s.expected_behavior } : {}),
        })),
        ...shared,
      };
      mutation.mutate(input);
    } else {
      if (!context.trim()) {
        setError('Context is required for review tests');
        return;
      }
      if (devicesToCheck.length === 0) {
        setError('Select at least one device to check');
        return;
      }

      const input: CreateReviewTestInput = {
        template_type: 'review_test',
        title,
        staging_url: stagingUrl,
        context,
        devices_to_check: devicesToCheck,
        ...(focusAreas.length > 0 ? { focus_areas: focusAreas } : {}),
        ...(ignoreAreas.trim() ? { ignore_areas: ignoreAreas } : {}),
        ...shared,
      };
      mutation.mutate(input);
    }
  };

  const isFlow = templateType === 'flow_test';
  const creditCost = isFlow ? 2 + steps.filter((s) => s.instruction.trim()).length : 3;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Create Test Case</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Choose a test type and fill in the details.{' '}
          <Link href="/builder/templates" className="text-accent-flow hover:text-accent-flow/80">
            View template schemas
          </Link>
        </p>
      </div>

      {/* Template type selector */}
      <div className="flex gap-1 p-1 bg-surface-secondary rounded-lg mb-6">
        <button
          type="button"
          onClick={() => setTemplateType('flow_test')}
          className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            isFlow ? 'bg-surface text-accent-flow shadow-sm' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Flow Test
        </button>
        <button
          type="button"
          onClick={() => setTemplateType('review_test')}
          className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            !isFlow ? 'bg-surface text-accent-review shadow-sm' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Review Test
        </button>
      </div>

      {/* Type description */}
      <div className={`text-xs leading-relaxed mb-6 p-3 rounded-lg border ${
        isFlow ? 'bg-accent-flow/10 border-accent-flow/20 text-accent-flow' : 'bg-accent-review/10 border-accent-review/20 text-accent-review'
      }`}>
        {isFlow
          ? 'Structured step-by-step verification. Tester follows each step and reports pass/fail.'
          : 'Exploratory review. Tester explores freely and reports findings. Bonus credits per valid finding.'
        }
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Shared: Title */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={isFlow ? 'e.g., Verify checkout flow on staging' : 'e.g., Review landing page for visual issues'}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50"
            required />
        </div>

        {/* Shared: Description */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional context for the tester..."
            rows={2}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 resize-none" />
        </div>

        {/* Shared: Staging URL */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Staging URL</label>
          <input type="url" value={stagingUrl} onChange={(e) => setStagingUrl(e.target.value)}
            placeholder="https://staging.example.com"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50"
            required />
        </div>

        {/* Shared: Environment */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Environment</label>
          <select value={environment} onChange={(e) => setEnvironment(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50">
            <option value="staging">Staging</option>
            <option value="production">Production</option>
            <option value="localhost">Localhost</option>
          </select>
        </div>

        {/* Flow test specific fields */}
        {isFlow && (
          <>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Expected Behavior</label>
              <textarea value={expectedBehavior} onChange={(e) => setExpectedBehavior(e.target.value)}
                placeholder="e.g., Complete checkout end-to-end without errors"
                rows={2}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 resize-none"
                required />
            </div>
            <StepEditor steps={steps} onChange={setSteps} />
          </>
        )}

        {/* Review test specific fields */}
        {!isFlow && (
          <>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Context</label>
              <textarea value={context} onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., This is an e-commerce landing page selling handmade furniture. Target audience is 25-40 year olds. Should feel premium and clean."
                rows={3}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 resize-none"
                required />
              <p className="text-[11px] text-text-muted mt-1">Guides the tester's judgment -- what the app is and who it's for.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Devices to check</label>
              <div className="flex flex-wrap gap-2">
                {DEVICE_OPTIONS.map((d) => (
                  <label key={d.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    devicesToCheck.includes(d.value) ? 'bg-accent-review/10 border-accent-review/30 text-accent-review' : 'bg-surface border-border text-text-secondary hover:border-border'
                  }`}>
                    <input type="checkbox" checked={devicesToCheck.includes(d.value)}
                      onChange={(e) => setDevicesToCheck(
                        e.target.checked ? [...devicesToCheck, d.value] : devicesToCheck.filter((v) => v !== d.value)
                      )}
                      className="sr-only" />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Focus areas (optional)</label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((area) => (
                  <label key={area} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors capitalize ${
                    focusAreas.includes(area) ? 'bg-accent-review/10 border-accent-review/30 text-accent-review' : 'bg-surface border-border text-text-secondary hover:border-border'
                  }`}>
                    <input type="checkbox" checked={focusAreas.includes(area)}
                      onChange={(e) => setFocusAreas(
                        e.target.checked ? [...focusAreas, area] : focusAreas.filter((v) => v !== area)
                      )}
                      className="sr-only" />
                    {area}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Narrows scope for the tester.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Ignore (optional)</label>
              <textarea value={ignoreAreas} onChange={(e) => setIgnoreAreas(e.target.value)}
                placeholder="e.g., Footer is still placeholder, don't report issues there"
                rows={2}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 resize-none" />
              <p className="text-[11px] text-text-muted mt-1">Prevents noise from known WIP areas.</p>
            </div>
          </>
        )}

        {/* Advanced */}
        <div>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1">
            <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Advanced options
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 pl-4 border-l-2 border-border">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Callback URL</label>
                <input type="url" value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="https://api.example.com/webhooks/test-complete"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">External ID</label>
                <input type="text" value={externalId} onChange={(e) => setExternalId(e.target.value)}
                  placeholder="Your internal reference ID"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Tags</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                  placeholder="regression, checkout, critical (comma-separated)"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-accent-danger bg-accent-danger/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-text-secondary">
            {isFlow ? (
              <>Estimated cost: <span className="font-medium text-text-primary">{creditCost} credits</span></>
            ) : (
              <>Base cost: <span className="font-medium text-text-primary">{creditCost} credits</span> <span className="text-xs text-text-muted">+ bonus per finding</span></>
            )}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => router.back()}
              className="px-4 py-2 border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-secondary hover:border-border transition-all duration-200">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className={`px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isFlow ? 'bg-accent-flow hover:bg-accent-flow/90' : 'bg-accent-review hover:bg-accent-review/90'
              }`}>
              {mutation.isPending ? 'Creating...' : 'Create Test Case'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewTestCasePage() {
  return (
    <Suspense>
      <NewTestCaseForm />
    </Suspense>
  );
}
