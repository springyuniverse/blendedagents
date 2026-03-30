'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getBalance, listTestCases } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

export default function DashboardPage() {
  const { data: balance } = useQuery({ queryKey: ['credit-balance'], queryFn: getBalance });
  const { data: recentTests } = useQuery({
    queryKey: ['test-cases', { page: 1 }],
    queryFn: () => listTestCases({ page: 1 }),
  });

  const tests = recentTests?.data?.slice(0, 5) || [];
  const totalTests = recentTests?.pagination?.total || 0;
  const completedTests = tests.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your testing activity</p>
        </div>
        <Link
          href="/test-cases/new"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
        >
          Create New Test
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="text-sm text-gray-500 mb-1">Available Credits</div>
          <div className="text-2xl font-semibold text-gray-900">
            {balance?.available ?? '...'}
          </div>
          {balance && balance.reserved > 0 && (
            <div className="text-xs text-gray-500 mt-1">{balance.reserved} reserved</div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="text-sm text-gray-500 mb-1">Total Tests</div>
          <div className="text-2xl font-semibold text-gray-900">{totalTests}</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="text-sm text-gray-500 mb-1">Completion Rate</div>
          <div className="text-2xl font-semibold text-gray-900">
            {totalTests > 0 ? `${Math.round((completedTests / tests.length) * 100)}%` : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Recent tests</div>
        </div>
      </div>

      {/* Recent Test Cases */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Recent Test Cases</h2>
          <Link href="/test-cases" className="text-xs text-gray-500 hover:text-gray-700">
            View all
          </Link>
        </div>

        {tests.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">No test cases yet</p>
            <Link
              href="/test-cases/new"
              className="inline-block mt-2 text-sm text-gray-900 font-medium hover:underline"
            >
              Create your first test
            </Link>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
