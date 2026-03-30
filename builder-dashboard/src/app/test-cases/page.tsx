'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listTestCases } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

const STATUSES = ['all', 'queued', 'assigned', 'in_progress', 'completed', 'cancelled'] as const;
const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  queued: 'Queued',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function TestCasesPage() {
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['test-cases', { status, page, search }],
    queryFn: () =>
      listTestCases({
        page,
        status: status === 'all' ? undefined : status,
        search: search || undefined,
      }),
  });

  const tests = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Test Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pagination ? `${pagination.total} total` : 'Loading...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/templates"
            className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            From Template
          </Link>
          <Link
            href="/test-cases/new"
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            Create Test
          </Link>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search test cases..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              status === s
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ) : tests.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No test cases found
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-2.5">Title</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-2.5">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-2.5">Steps</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-2.5">Cost</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-2.5">Created</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((tc) => (
                  <tr key={tc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/test-cases/${tc.id}`} className="text-sm text-gray-900 hover:underline font-medium">
                        {tc.title}
                      </Link>
                      {tc.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{tc.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={tc.status} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 text-right">{tc.steps.length}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 text-right">{tc.credit_cost}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 text-right">
                      {new Date(tc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= (pagination?.total_pages || 1)}
                    className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
