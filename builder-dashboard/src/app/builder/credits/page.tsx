'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBalance, estimateCredits, topup, getTransactions, type CreditEstimate, type Transaction } from '@/lib/api';
import { RefreshCw, Info, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Preset amounts ---
const PRESETS = [1000, 2500, 5000, 10000, 25000, 50000]; // in cents

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

// --- Add Credits Modal ---

function AddCreditsModal({ onClose }: { onClose: () => void }) {
  const [amountCents, setAmountCents] = useState(1000);
  const [customInput, setCustomInput] = useState('10');
  const [isCustom, setIsCustom] = useState(false);
  const [estimate, setEstimate] = useState<CreditEstimate | null>(null);

  const fetchEstimate = useCallback(async (cents: number) => {
    if (cents < 1000) return;
    try {
      const est = await estimateCredits(cents);
      setEstimate(est);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchEstimate(amountCents);
  }, [amountCents, fetchEstimate]);

  const buyMutation = useMutation({
    mutationFn: () => topup(amountCents),
    onSuccess: (data) => { window.location.href = data.checkout_url; },
  });

  const handleCustomChange = (val: string) => {
    setCustomInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 10) {
      setAmountCents(Math.round(num * 100));
    }
  };

  const selectPreset = (cents: number) => {
    setIsCustom(false);
    setAmountCents(cents);
    setCustomInput((cents / 100).toString());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-lifted w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Add Credits</h2>
          <p className="text-[13px] text-text-muted mt-0.5">Choose an amount or enter a custom value</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Preset grid */}
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((cents) => (
              <button
                key={cents}
                onClick={() => selectPreset(cents)}
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  !isCustom && amountCents === cents
                    ? 'bg-accent-flow text-white'
                    : 'bg-surface-secondary text-text-secondary hover:text-text-primary hover:bg-surface-secondary/80 border border-border'
                }`}
              >
                {formatDollars(cents)}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Custom amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-base font-medium">$</span>
              <input
                type="number"
                min="10"
                max="1000"
                step="1"
                value={customInput}
                onFocus={() => setIsCustom(true)}
                onChange={(e) => { setIsCustom(true); handleCustomChange(e.target.value); }}
                className="w-full pl-7 pr-3 py-2.5 bg-surface-secondary border border-border rounded-lg text-base text-text-primary font-medium focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50"
                placeholder="10"
              />
            </div>
            <p className="text-[11px] text-text-muted mt-1">Minimum $10 &middot; Maximum $1,000</p>
          </div>

          {/* Estimate */}
          {estimate && amountCents >= 1000 && (
            <div className="bg-surface-secondary border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-muted">You pay</span>
                <span className="text-base font-bold text-text-primary">{formatDollars(estimate.amount_cents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-muted">You get</span>
                <span className="text-base font-bold text-accent-flow">{estimate.credits} credits</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-xs text-text-muted">Rate</span>
                <span className="text-xs text-text-secondary font-mono">${estimate.per_credit.toFixed(3)}/credit</span>
              </div>
              {estimate.discount_label !== 'Base rate' && (
                <div className="flex items-center gap-1">
                  <Info className="w-3 h-3 text-accent-review" />
                  <span className="text-xs text-accent-review font-medium">{estimate.discount_label}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border text-text-secondary text-sm font-medium rounded-lg hover:bg-surface-secondary transition-colors">
            Cancel
          </button>
          <button
            onClick={() => buyMutation.mutate()}
            disabled={buyMutation.isPending || amountCents < 1000}
            className="flex-1 py-2.5 bg-accent-flow text-white text-sm font-medium rounded-lg hover:bg-accent-flow/90 disabled:opacity-50 transition-all"
          >
            {buyMutation.isPending ? 'Redirecting...' : `Add Credits`}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Transaction Row ---

const TYPE_STYLES: Record<string, string> = {
  topup: 'text-accent-review',
  charge: 'text-accent-danger',
  refund: 'text-accent-flow',
  payout: 'text-accent-warning',
  commission: 'text-text-muted',
};

// --- Main Page ---

export default function CreditsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [txCursor, setTxCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['credit-balance'],
    queryFn: getBalance,
    refetchInterval: 15_000,
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions', txCursor],
    queryFn: () => getTransactions(txCursor),
  });

  const transactions = txData?.transactions ?? [];

  const dollarValue = balance ? (balance.available_credits * (balance.per_credit_rate || 0.10)).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Credits</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {balance ? `${balance.available_credits} credits available` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['credit-balance'] })}
          className="p-2 text-text-muted hover:text-text-secondary rounded-lg hover:bg-surface-secondary transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Big balance display */}
      <div className="bg-surface border border-border rounded-lg p-8">
        {balanceLoading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-surface-secondary rounded w-1/4" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-text-secondary text-3xl font-light">$</span>
              <span className="text-5xl font-bold text-text-primary tracking-tight">{dollarValue}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[13px] text-text-muted font-mono">
              <span>{balance?.available_credits ?? 0} credits</span>
              {balance && balance.reserved_credits > 0 && (
                <>
                  <span className="text-border">&middot;</span>
                  <span>{balance.reserved_credits} reserved</span>
                </>
              )}
              {balance && balance.total_credits_used > 0 && (
                <>
                  <span className="text-border">&middot;</span>
                  <span>{balance.total_credits_used} used all time</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Buy Credits + Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-base font-semibold text-text-primary mb-1">Buy Credits</h2>
          <p className="text-[13px] text-text-muted mb-5">Volume discounts at $50, $100, $200+</p>
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-3 bg-accent-flow text-white text-[15px] font-semibold rounded-lg hover:bg-accent-flow/90 transition-all"
          >
            Add Credits
          </button>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-base font-semibold text-text-primary mb-1">Pricing</h2>
          <p className="text-[13px] text-text-muted mb-3">1 credit = $0.10 base rate</p>
          <div className="space-y-1.5">
            {[
              { range: 'Under $50', rate: '$0.100', discount: '' },
              { range: '$50+', rate: '$0.090', discount: '10% off' },
              { range: '$100+', rate: '$0.080', discount: '20% off' },
              { range: '$200+', rate: '$0.070', discount: '30% off' },
            ].map((tier) => (
              <div key={tier.range} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{tier.range}</span>
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-mono">{tier.rate}/credit</span>
                  {tier.discount && <span className="text-accent-review font-medium">{tier.discount}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Recent Transactions</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (cursorStack.length > 0) {
                  const prev = cursorStack[cursorStack.length - 1];
                  setCursorStack(cursorStack.slice(0, -1));
                  setTxCursor(prev === '__first__' ? undefined : prev);
                }
              }}
              disabled={cursorStack.length === 0}
              className="p-1.5 text-text-muted hover:text-text-secondary disabled:opacity-30 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (txData?.has_more && txData.next_cursor) {
                  setCursorStack([...cursorStack, txCursor ?? '__first__']);
                  setTxCursor(txData.next_cursor);
                }
              }}
              disabled={!txData?.has_more}
              className="p-1.5 text-text-muted hover:text-text-secondary disabled:opacity-30 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-text-muted">No transactions yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Date</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Description</th>
                <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-5 py-3 text-[13px] text-text-secondary font-mono">
                    {new Date(tx.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <span className="text-text-muted ml-1">
                      {new Date(tx.created_at).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-text-primary">{tx.description}</td>
                  <td className={`px-5 py-3 text-sm font-mono text-right ${TYPE_STYLES[tx.type] || 'text-text-secondary'}`}>
                    {tx.currency_amount > 0 ? '+' : ''}{formatDollars(Math.abs(tx.currency_amount_cents))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && <AddCreditsModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
