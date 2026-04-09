'use client';

import { useQuery } from '@tanstack/react-query';
import { getAdminStats, getAdminActivity } from '@/lib/admin-api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import {
  Users, UserCheck, ClipboardList, DollarSign, TrendingUp,
  ArrowUpRight, Activity, Percent, Timer,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  queued: '#9c8fb0',
  assigned: '#6c5fc7',
  in_progress: '#e5a500',
  completed: '#2ba185',
  cancelled: '#f55459',
  expired: '#9c8fb0',
  submitted: '#3b82f6',
};

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KpiCard({ icon: Icon, label, value, subtitle, iconColor }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string | number;
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

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string; color?: string }[]; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 shadow-lifted">
      <p className="text-[11px] text-text-muted font-mono mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[13px]">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || '#6c5fc7' }} />
          <span className="text-text-secondary capitalize">{p.dataKey.replace('_', ' ')}</span>
          <span className="text-text-primary font-medium ml-auto font-mono">{
            ['topups', 'commissions', 'payouts'].includes(p.dataKey) ? fmt(p.value) : p.value
          }</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  });
  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => getAdminActivity(30),
  });

  const isLoading = statsLoading || activityLoading;

  const totalTests = stats?.total_tests ?? 0;
  const completedTests = stats?.test_statuses?.completed ?? 0;
  const activeTests = (stats?.test_statuses?.queued ?? 0) + (stats?.test_statuses?.assigned ?? 0) + (stats?.test_statuses?.in_progress ?? 0);
  const completionRate = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

  const statusData = stats
    ? Object.entries(stats.test_statuses).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
    : [];

  const platformRevenue = stats
    ? stats.financials.total_topups_cents - stats.financials.total_payouts_cents
    : 0;

  // Format daily test data for chart
  const testActivityData = (activity?.daily_tests ?? []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    flow: d.flow,
    review: d.review,
  }));

  // Format daily revenue data for chart
  const revenueData = (activity?.daily_revenue ?? []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    topups: d.topups,
    commissions: d.commissions,
    payouts: d.payouts,
  }));

  // Format signup data for chart
  const signupData = (activity?.daily_signups ?? []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    builders: d.builders,
    testers: d.testers,
  }));

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-text-muted mt-0.5">Platform overview and analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Users}
          label="Total Builders"
          value={stats?.builders ?? 0}
          iconColor="bg-accent-flow/15 text-accent-flow"
        />
        <KpiCard
          icon={UserCheck}
          label="Total Testers"
          value={stats?.testers ?? 0}
          iconColor="bg-accent-review/15 text-accent-review"
        />
        <KpiCard
          icon={ClipboardList}
          label="Total Test Cases"
          value={totalTests}
          subtitle={`${activeTests} active · ${completedTests} completed`}
          iconColor="bg-accent-admin/15 text-accent-admin"
        />
        <KpiCard
          icon={Percent}
          label="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${completedTests} of ${totalTests} tests`}
          iconColor="bg-accent-warning/15 text-accent-warning"
        />
        <KpiCard
          icon={Timer}
          label="Avg Completion"
          value={stats?.avg_completion_minutes ? `${Math.round(stats.avg_completion_minutes)}m` : '—'}
          subtitle="Platform-wide average"
          iconColor="bg-teal-100 text-teal-600"
        />
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Total Revenue (Top-ups)"
          value={fmt(stats?.financials.total_topups_cents ?? 0)}
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="Platform Commission"
          value={fmt(stats?.financials.total_commissions_cents ?? 0)}
          iconColor="bg-violet-100 text-violet-600"
        />
        <KpiCard
          icon={ArrowUpRight}
          label="Tester Payouts"
          value={fmt(stats?.financials.total_payouts_cents ?? 0)}
          iconColor="bg-blue-100 text-blue-600"
        />
        <KpiCard
          icon={Activity}
          label="Net Platform Revenue"
          value={fmt(platformRevenue)}
          subtitle="Top-ups minus payouts"
          iconColor="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Charts Row 1: Test Activity + Status Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Test Activity</h2>
              <p className="text-xs text-text-muted mt-0.5">Flow vs Review tests — last 30 days</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-flow" />
                <span className="text-xs text-text-muted">Flow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-review" />
                <span className="text-xs text-text-muted">Review</span>
              </div>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={testActivityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c5fc7" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6c5fc7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradReview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2ba185" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2ba185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ece8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="flow" stroke="#6c5fc7" strokeWidth={2} fill="url(#gradFlow)" />
                <Area type="monotone" dataKey="review" stroke="#2ba185" strokeWidth={2} fill="url(#gradReview)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-1">Status Breakdown</h2>
          <p className="text-xs text-text-muted mb-4">All test cases</p>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-44">
              <p className="text-[13px] text-text-muted">No data yet</p>
            </div>
          ) : (
            <>
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#5a5a72'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {statusData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[entry.name] || '#5a5a72' }} />
                      <span className="text-xs text-text-secondary capitalize">{entry.name.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs font-mono text-text-primary">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts Row 2: Revenue + User Growth */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Revenue & Payouts</h2>
              <p className="text-xs text-text-muted mt-0.5">Daily financial activity — 30 days</p>
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
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ece8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="topups" fill="#10b981" radius={[3, 3, 0, 0]} barSize={8} />
                <Bar dataKey="commissions" fill="#8b5cf6" radius={[3, 3, 0, 0]} barSize={8} />
                <Bar dataKey="payouts" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">User Growth</h2>
              <p className="text-xs text-text-muted mt-0.5">New signups — 30 days</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-flow" />
                <span className="text-xs text-text-muted">Builders</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-review" />
                <span className="text-xs text-text-muted">Testers</span>
              </div>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBuilders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c5fc7" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6c5fc7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTesters" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2ba185" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2ba185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ece8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="builders" stroke="#6c5fc7" strokeWidth={2} fill="url(#gradBuilders)" />
                <Area type="monotone" dataKey="testers" stroke="#2ba185" strokeWidth={2} fill="url(#gradTesters)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
