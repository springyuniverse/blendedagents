'use client';

import { useQuery } from '@tanstack/react-query';
import { getBalance } from '@/lib/api';
import { Coins } from 'lucide-react';

export function CreditBalance({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['credit-balance'],
    queryFn: getBalance,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className={compact ? 'text-sm text-text-muted' : ''}>
        <span className="animate-pulse">...</span>
      </div>
    );
  }

  if (!data) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Coins className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
        <span className="text-text-primary font-medium">{data.available_credits}</span>
        {data.reserved_credits > 0 && (
          <span className="text-text-muted text-xs">({data.reserved_credits} held)</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="text-sm text-text-secondary mb-1">Credit Balance</div>
      <div className="text-3xl font-bold text-text-primary">{data.available_credits}</div>
      <div className="mt-2 flex gap-4 text-[13px] text-text-muted font-mono">
        <span>Reserved: {data.reserved_credits}</span>
        <span>Used: {data.total_credits_used}</span>
      </div>
    </div>
  );
}
