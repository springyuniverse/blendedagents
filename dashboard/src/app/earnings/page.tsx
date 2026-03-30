'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    paid: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
        styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'
      }`}
    >
      {status}
    </span>
  );
}

export default function EarningsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['earnings'],
    queryFn: () => api.getEarnings(),
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Loading earnings...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        Failed to load earnings: {error.message}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Earnings</h2>
        <p className="text-sm text-gray-500 mt-1">Your earnings and payout history</p>
      </div>

      {/* Total earnings card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Earnings</p>
        <p className="text-3xl font-semibold text-gray-900 mt-1">
          ${(data.total_earnings_cents / 100).toFixed(2)}
        </p>
      </div>

      {/* Earnings table */}
      {data.earnings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No earnings yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Complete test cases to earn payouts.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Test Case</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.earnings.map((earning) => (
                <tr key={earning.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(earning.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                    {earning.test_case_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    ${(earning.amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={earning.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
