'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '@/lib/api';

const TYPE_STYLES: Record<string, string> = {
  topup: 'text-green-700',
  charge: 'text-red-700',
  refund: 'text-blue-700',
  adjustment: 'text-gray-700',
};

export function TransactionHistory() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => getTransactions(page),
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const transactions = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-900">Transaction History</h3>
      </div>

      {transactions.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">
          No transactions yet
        </div>
      ) : (
        <>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-2.5">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-2.5">Description</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-2.5">Amount</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`text-sm font-medium capitalize ${TYPE_STYLES[tx.type] || 'text-gray-700'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{tx.description}</td>
                  <td className={`px-5 py-3 text-sm font-medium text-right ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">
                    {new Date(tx.created_at).toLocaleDateString()}
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
  );
}
