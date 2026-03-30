'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTemplates, deleteTemplate, useTemplate } from '@/lib/api';

export default function TemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setDeletingId(null);
    },
  });

  const useMutation_ = useMutation({
    mutationFn: (id: string) => useTemplate(id),
    onSuccess: (testCase) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['credit-balance'] });
      router.push(`/test-cases/${testCase.id}`);
    },
  });

  const templates = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reusable test case templates</p>
        </div>
        <Link
          href="/templates/new"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
        >
          Create Template
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">No templates yet</p>
          <Link
            href="/templates/new"
            className="inline-block mt-2 text-sm text-gray-900 font-medium hover:underline"
          >
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link
                    href={`/templates/${template.id}`}
                    className="text-sm font-medium text-gray-900 hover:underline"
                  >
                    {template.title}
                  </Link>
                  {template.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                <span>{template.steps.length} steps</span>
                {template.last_used_at && (
                  <span>Last used {new Date(template.last_used_at).toLocaleDateString()}</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => useMutation_.mutate(template.id)}
                  disabled={useMutation_.isPending}
                  className="flex-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  Use Template
                </button>
                <Link
                  href={`/templates/${template.id}`}
                  className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => {
                    if (deletingId === template.id) {
                      deleteMutation.mutate(template.id);
                    } else {
                      setDeletingId(template.id);
                      setTimeout(() => setDeletingId(null), 3000);
                    }
                  }}
                  className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-md hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  {deletingId === template.id ? 'Confirm?' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
