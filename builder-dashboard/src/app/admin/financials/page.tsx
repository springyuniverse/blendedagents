'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminStats, getAdminActivity, getAdminTransactions, type AdminTransaction } from '@/lib/admin-api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Landmark,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_COLORS: Record<string, string> = {
  topup: '#10b981',
  charge: '#f55459',
  commission: '#8b5cf6',
  payout: '#3b82f6',
  refund: '#e5a500',
};

const TYPE_LABELS: Record<string, string> = {
  topup: 'Top-up',
  charge: 'Charge',
  commission: 'Commission',
  payout: 'Payout',
  refund: 'Refund',
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string; color?: string }[]; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 shadow-lifted">
      <p className="text-[11px] text-text-muted font-mono mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[13px]">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || '#6c5fc7' }} />
          <span className="text-text-secondary capitalize">{p.dataKey}</span>
          <span className="text-text-primary font-medium ml-auto font-mono">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, subtitle, iconColor }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  subtitle?: string;
  iconColor: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 hover:shadow-lifted transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary tracking-tight">{value}</div>
      <div className="text-[13px] text-text-muted mt-0.5">{label}</div>
      {subtitle && <div className="text-xs text-text-secondary mt-1">{subtitle}</div>}
    </div>
  );
}

export default function AdminFinancialsPage() {
  const [txPage, setTxPage] = useState(1);
  const [txType, setTxType] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  });

  const { data: activity } = useQuery({
    queryKey: ['admin-activity', 30],
    queryFn: () => getAdminActivity(30),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['admin-transactions', txPage, txType],
    queryFn: () => getAdminTransactions({ page: txPage, limit: 15, type: txType || undefined }),
  });

  const fin = stats?.financials;
  const netRevenue = fin ? fin.total_topups_cents - fin.total_payouts_cents : 0;

  const revenueData = (activity?.daily_revenue ?? []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    topups: d.topups,
    commissions: d.commissions,
    payouts: d.payouts,
  }));

  // Revenue breakdown pie
  const breakdownData = fin ? [
    { name: 'Commission', value: fin.total_commissions_cents, color: '#8b5cf6' },
    { name: 'Payouts', value: fin.total_payouts_cents, color: '#3b82f6' },
    { name: 'Platform Retained', value: Math.max(0, fin.total_topups_cents - fin.total_payouts_cents - fin.total_commissions_cents), color: '#10b981' },
  ].filter(d => d.value > 0) : [];

  const txTypes = ['', 'topup', 'charge', 'commission', 'payout', 'refund'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Financials</h1>
        <p className="text-sm text-text-muted mt-0.5">Revenue, commissions, and transaction history</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={ArrowUpRight}
          label="Total Top-ups"
          value={fmt(fin?.total_topups_cents ?? 0)}
          subtitle="Builder deposits"
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="Platform Commission"
          value={fmt(fin?.total_commissions_cents ?? 0)}
          subtitle="Platform earnings"
          iconColor="bg-violet-100 text-violet-600"
        />
        <KpiCard
          icon={ArrowDownRight}
          label="Tester Payouts"
          value={fmt(fin?.total_payouts_cents ?? 0)}
          subtitle="Paid to testers"
          iconColor="bg-blue-100 text-blue-600"
        />
        <KpiCard
          icon={Landmark}
          label="Net Revenue"
          value={fmt(netRevenue)}
          subtitle="Top-ups minus payouts"
          iconColor="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue over time */}
        <div className="col-span-2 bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Revenue Flow</h2>
              <p className="text-xs text-text-muted mt-0.5">Daily top-ups, commission, payouts — 30 days</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-text-muted">Top-ups</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-xs text-text-muted">Commission</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-text-muted">Payouts</span>
              </div>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTopups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradComm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPayouts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ece8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="topups" stroke="#10b981" strokeWidth={2} fill="url(#gradTopups)" />
                <Area type="monotone" dataKey="commissions" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradComm)" />
                <Area type="monotone" dataKey="payouts" stroke="#3b82f6" strokeWidth={2} fill="url(#gradPayouts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue breakdown pie */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-1">Revenue Breakdown</h2>
          <p className="text-xs text-text-muted mb-4">Where money flows</p>
          {breakdownData.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-[13px] text-text-muted">No data yet</p>
            </div>
          ) : (
            <>
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdownData} innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value" stroke="none">
                      {breakdownData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {breakdownData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                      <span className="text-xs text-text-secondary">{entry.name}</span>
                    </div>
                    <span className="text-xs font-mono text-text-primary">{fmt(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Transaction History</h2>
            <p className="text-xs text-text-muted mt-0.5">{txData?.total ?? 0} total transactions</p>
          </div>
          <div className="flex items-center gap-1 bg-surface-secondary rounded-lg p-0.5">
            {txTypes.map(t => (
              <button key={t} onClick={() => { setTxType(t); setTxPage(1); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  txType === t
                    ? 'bg-accent-admin text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}>
                {t ? TYPE_LABELS[t] || t : 'All'}
              </button>
            ))}
          </div>
        </div>

        {txLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Date</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Type</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Description</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Party</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Credits</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(txData?.transactions ?? []).map((tx: AdminTransaction) => (
                  <tr key={tx.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-5 py-3 text-[13px] text-text-muted font-mono">
                      {new Date(tx.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium" style={{
                        backgroundColor: (TYPE_COLORS[tx.type] || '#6c5fc7') + '15',
                        color: TYPE_COLORS[tx.type] || '#6c5fc7',
                      }}>
                        {TYPE_LABELS[tx.type] || tx.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-text-secondary truncate max-w-[200px]">
                      {tx.description || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-text-secondary">
                      {tx.builder_name || tx.tester_name || '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-mono text-text-primary">
                      {tx.credit_amount > 0 ? '+' : ''}{tx.credit_amount}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-mono text-text-primary">
                      {fmt(Math.abs(tx.currency_amount_cents))}
                    </td>
                  </tr>
                ))}
                {(txData?.transactions ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-text-muted">
                      No transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {txData && txData.total_pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <p className="text-xs text-text-muted">
                  Showing {((txPage - 1) * txData.per_page) + 1}–{Math.min(txPage * txData.per_page, txData.total)} of {txData.total}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage <= 1}
                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-text-secondary px-2 font-mono">{txPage} / {txData.total_pages}</span>
                  <button onClick={() => setTxPage(p => Math.min(txData.total_pages, p + 1))} disabled={txPage >= txData.total_pages}
                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-4 h-4" />
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
