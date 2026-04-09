'use client';

import { useQuery } from '@tanstack/react-query';
import { testerApi } from '@/lib/tester-api';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-accent-review/10 text-accent-review border-accent-review/20',
    pending: 'bg-accent-warning/10 text-accent-warning border-accent-warning/20',
    paid: 'bg-accent-review/10 text-accent-review border-accent-review/20',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || 'bg-surface-secondary text-text-primary border-border'}`}>
      {status}
    </span>
  );
}

export default function EarningsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tester-earnings'],
    queryFn: () => testerApi.getEarnings(),
  });

  if (isLoading) return <div className="text-sm text-text-secondary py-8 text-center">Loading earnings...</div>;

  if (error) {
    return (
      <div className="bg-accent-danger/10 border border-accent-danger/20 rounded-lg p-4 text-sm text-accent-danger">
        Failed to load earnings: {error.message}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary">Earnings</h2>
        <p className="text-sm text-text-secondary mt-1">Your earnings and payout history</p>
      </div>

      <div className="bg-surface border border-border rounded-lg shadow-soft p-5 mb-6">
        <p className="text-xs text-text-secondary uppercase tracking-wide">Total Earnings</p>
        <p className="text-3xl font-semibold text-text-primary mt-1">
          ${(data.total_earnings_cents / 100).toFixed(2)}
        </p>
      </div>

      {data.earnings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-text-secondary">No earnings yet</p>
          <p className="text-xs text-text-muted mt-1">Complete test cases to earn payouts.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg shadow-soft overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Test Case</th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {data.earnings.map((earning) => (
                <tr key={earning.id} className="hover:bg-surface-secondary">
                  <td className="px-4 py-3 text-sm text-text-secondary">{new Date(earning.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary font-mono text-xs">{earning.test_case_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">${(earning.amount_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={earning.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
