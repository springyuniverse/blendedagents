'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '@/lib/api';

const TYPE_STYLES: Record<string, string> = {
  topup: 'text-emerald-600',
  charge: 'text-accent-danger',
  refund: 'text-blue-600',
  adjustment: 'text-text-secondary',
};

export function TransactionHistory() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => getTransactions(String(page)),
  });

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-lg shadow-soft p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-surface-secondary rounded" />
          ))}
        </div>
      </div>
    );
  }

  const transactions = data?.transactions || [];
  const hasMore = data?.has_more;

  return (
    <div className="bg-surface border border-border rounded-lg shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">Transaction History</h3>
      </div>

      {transactions.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-text-secondary">
          No transactions yet
        </div>
      ) : (
        <>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-text-secondary px-5 py-2.5">Type</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-5 py-2.5">Description</th>
                <th className="text-right text-xs font-semibold text-text-secondary px-5 py-2.5">Amount</th>
                <th className="text-right text-xs font-semibold text-text-secondary px-5 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border-subtle hover:bg-surface-secondary transition-colors">
                  <td className="px-5 py-3">
                    <span className={`text-sm font-medium capitalize ${TYPE_STYLES[tx.type] || 'text-text-secondary'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-text-secondary">{tx.description}</td>
                  <td className={`px-5 py-3 text-sm font-medium text-right ${tx.credit_amount > 0 ? 'text-emerald-600' : 'text-text-primary'}`}>
                    {tx.credit_amount > 0 ? '+' : ''}{tx.credit_amount}
                  </td>
                  <td className="px-5 py-3 text-sm text-text-secondary text-right">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(hasMore || page > 1) && (
            <div className="flex items-center justify-end px-5 py-3 border-t border-border gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
