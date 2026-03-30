'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { getBalance, getPacks, topup } from '@/lib/api';
import { CreditBalance } from '@/components/CreditBalance';
import { TransactionHistory } from '@/components/TransactionHistory';

export default function CreditsPage() {
  const { data: packs, isLoading: packsLoading } = useQuery({
    queryKey: ['credit-packs'],
    queryFn: getPacks,
  });

  const { data: balance } = useQuery({
    queryKey: ['credit-balance'],
    queryFn: getBalance,
  });

  const buyMutation = useMutation({
    mutationFn: topup,
    onSuccess: (data) => {
      window.location.href = data.checkout_url;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Credits & Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your credit balance and purchase packs</p>
      </div>

      {/* Balance */}
      <CreditBalance />

      {/* Credit Packs */}
      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-3">Purchase Credits</h2>
        {packsLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-6 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(packs?.data || []).map((pack) => (
              <div
                key={pack.id}
                className={`bg-white border rounded-lg p-5 relative ${
                  pack.popular ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-gray-900 text-white text-xs font-medium rounded-full">
                    Popular
                  </span>
                )}
                <h3 className="text-sm font-medium text-gray-900">{pack.name}</h3>
                <div className="mt-2">
                  <span className="text-2xl font-semibold text-gray-900">
                    {pack.credits}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">credits</span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  ${(pack.price_cents / 100).toFixed(2)} {pack.currency.toUpperCase()}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  ${(pack.price_cents / pack.credits / 100).toFixed(3)}/credit
                </div>
                <button
                  onClick={() => buyMutation.mutate(pack.id)}
                  disabled={buyMutation.isPending}
                  className={`w-full mt-4 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                    pack.popular
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {buyMutation.isPending ? 'Redirecting...' : 'Buy'}
                </button>
              </div>
            ))}
          </div>
        )}

        {balance?.rate_per_credit && (
          <p className="mt-3 text-xs text-gray-500">
            Current rate: ${(balance.rate_per_credit / 100).toFixed(2)} per credit
          </p>
        )}
      </div>

      {/* Transaction History */}
      <TransactionHistory />
    </div>
  );
}
