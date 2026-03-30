'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTemplate, createTemplate, updateTemplate, useTemplate, type TemplateInput } from '@/lib/api';
import { StepEditor, type Step } from '@/components/StepEditor';
import Link from 'next/link';

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: template } = useQuery({
    queryKey: ['template', id],
    queryFn: () => getTemplate(id),
    enabled: !isNew,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stagingUrl, setStagingUrl] = useState('');
  const [steps, setSteps] = useState<Step[]>([{ instruction: '', expected_behavior: '' }]);
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setDescription(template.description || '');
      setStagingUrl(template.staging_url || '');
      setSteps(
        template.steps.map((s) => ({
          instruction: s.instruction,
          expected_behavior: s.expected_behavior || '',
        })),
      );
      setTags(template.tags?.join(', ') || '');
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: (input: TemplateInput) =>
      isNew ? createTemplate(input) : updateTemplate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      router.push('/templates');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    },
  });

  const useMutation_ = useMutation({
    mutationFn: () => useTemplate(id),
    onSuccess: (testCase) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['credit-balance'] });
      router.push(`/test-cases/${testCase.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validSteps = steps.filter((s) => s.instruction.trim());
    if (validSteps.length === 0) {
      setError('At least one step is required');
      return;
    }

    const input: TemplateInput = {
      title,
      steps: validSteps.map((s) => ({
        instruction: s.instruction,
        ...(s.expected_behavior ? { expected_behavior: s.expected_behavior } : {}),
      })),
      ...(description ? { description } : {}),
      ...(stagingUrl ? { staging_url: stagingUrl } : {}),
      ...(tags ? { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) } : {}),
    };

    saveMutation.mutate(input);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-700">
              Templates
            </Link>
            <span className="text-gray-300">/</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            {isNew ? 'Create Template' : 'Edit Template'}
          </h1>
        </div>
        {!isNew && (
          <button
            onClick={() => useMutation_.mutate()}
            disabled={useMutation_.isPending}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {useMutation_.isPending ? 'Creating...' : 'Use Template'}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Checkout flow template"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this template tests..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Staging URL (optional)</label>
          <input
            type="url"
            value={stagingUrl}
            onChange={(e) => setStagingUrl(e.target.value)}
            placeholder="https://staging.example.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        <StepEditor steps={steps} onChange={setSteps} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (optional)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="regression, checkout (comma-separated)"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
