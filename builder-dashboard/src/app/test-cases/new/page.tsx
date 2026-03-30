'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTestCase, type CreateTestCaseInput } from '@/lib/api';
import { StepEditor, type Step } from '@/components/StepEditor';
import Link from 'next/link';

function NewTestCaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(searchParams.get('title') || '');
  const [description, setDescription] = useState(searchParams.get('description') || '');
  const [stagingUrl, setStagingUrl] = useState(searchParams.get('staging_url') || '');
  const [steps, setSteps] = useState<Step[]>([{ instruction: '', expected_behavior: '' }]);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [externalId, setExternalId] = useState('');
  const [tags, setTags] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: createTestCase,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['credit-balance'] });
      router.push(`/test-cases/${data.id}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create test case');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validSteps = steps.filter((s) => s.instruction.trim());
    if (validSteps.length === 0) {
      setError('At least one step with an instruction is required');
      return;
    }

    const input: CreateTestCaseInput = {
      title,
      staging_url: stagingUrl,
      steps: validSteps.map((s) => ({
        instruction: s.instruction,
        ...(s.expected_behavior ? { expected_behavior: s.expected_behavior } : {}),
      })),
      ...(description ? { description } : {}),
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      ...(externalId ? { external_id: externalId } : {}),
      ...(tags ? { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) } : {}),
    };

    mutation.mutate(input);
  };

  const creditCost = 2 + steps.filter((s) => s.instruction.trim()).length;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Create Test Case</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Define the steps a human tester should perform.{' '}
          <Link href="/templates" className="text-gray-900 hover:underline">
            Or use a template
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Login flow verification"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional context for the tester..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Staging URL</label>
          <input
            type="url"
            value={stagingUrl}
            onChange={(e) => setStagingUrl(e.target.value)}
            placeholder="https://staging.example.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            required
          />
        </div>

        <StepEditor steps={steps} onChange={setSteps} />

        {/* Advanced Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Advanced options
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 pl-4 border-l-2 border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Callback URL</label>
                <input
                  type="url"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="https://api.example.com/webhooks/test-complete"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">External ID</label>
                <input
                  type="text"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder="Your internal reference ID"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="regression, checkout, critical (comma-separated)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            Estimated cost: <span className="font-medium text-gray-900">{creditCost} credits</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
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
