'use client';

import { useQuery } from '@tanstack/react-query';
import { getBalance } from '@/lib/api';

export function CreditBalance({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['credit-balance'],
    queryFn: getBalance,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className={compact ? 'text-sm text-gray-400' : ''}>
        <span className="animate-pulse">...</span>
      </div>
    );
  }

  if (!data) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
        <span className="text-white font-medium">{data.available}</span>
        {data.reserved > 0 && (
          <span className="text-gray-500 text-xs">({data.reserved} held)</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="text-sm text-gray-500 mb-1">Credit Balance</div>
      <div className="text-3xl font-semibold text-gray-900">{data.available}</div>
      <div className="mt-2 flex gap-4 text-sm text-gray-500">
        <span>Reserved: {data.reserved}</span>
        <span>Total: {data.total}</span>
        {data.rate_per_credit && <span>${(data.rate_per_credit / 100).toFixed(2)}/credit</span>}
      </div>
    </div>
  );
}
