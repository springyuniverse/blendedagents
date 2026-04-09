'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getBalance, listTestCases, type TestCase } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Plus, Activity, CheckCircle2, Clock, Coins } from 'lucide-react';

// --- Chart helpers ---

function generateActivityData(tests: TestCase[]) {
  const days = 14;
  const data: { date: string; flow: number; review: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayLabel = date.toLocaleDateString('en', { month: 'short', day: 'numeric' });

    const dayTests = tests.filter((t) => t.created_at.startsWith(dateStr));
    data.push({
      date: dayLabel,
      flow: dayTests.filter((t) => t.template_type === 'flow_test' || !t.template_type).length,
      review: dayTests.filter((t) => t.template_type === 'review_test').length,
    });
  }
  return data;
}

function generateStatusData(tests: TestCase[]) {
  const counts: Record<string, number> = {};
  for (const t of tests) {
    counts[t.status] = (counts[t.status] || 0) + 1;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

const STATUS_COLORS: Record<string, string> = {
  queued: '#9c8fb0',
  assigned: '#6c5fc7',
  in_progress: '#e5a500',
  completed: '#2ba185',
  cancelled: '#f55459',
  expired: '#9c8fb0',
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lifted">
      <p className="text-xs text-text-muted font-mono mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-[13px] text-text-primary">
          <span className={p.dataKey === 'flow' ? 'text-accent-flow' : 'text-accent-review'}>
            {p.dataKey === 'flow' ? 'Flow' : 'Review'}
          </span>
          : {p.value}
        </p>
      ))}
    </div>
  );
}

// --- KPI Card ---

function KpiCard({ icon: Icon, label, value, subtitle, trend, iconColor }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: string; up: boolean } | null;
  iconColor: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend.up ? 'text-accent-review' : 'text-accent-danger'}`}>
            {trend.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-text-primary tracking-tight">{value}</div>
      <div className="text-[13px] text-text-muted mt-0.5">{label}</div>
      {subtitle && <div className="text-xs text-text-secondary mt-1">{subtitle}</div>}
    </div>
  );
}

// --- Main Page ---

export default function BuilderDashboardPage() {
  const { data: balance } = useQuery({ queryKey: ['credit-balance'], queryFn: getBalance });
  // Fetch all statuses separately for accurate KPI counts
  const { data: recentTests } = useQuery({
    queryKey: ['test-cases-dashboard'],
    queryFn: () => listTestCases({ page: 1, limit: 500 }),
  });
  const { data: queuedData } = useQuery({
    queryKey: ['test-cases-count', 'queued'],
    queryFn: () => listTestCases({ status: 'queued', limit: 1 }),
  });
  const { data: assignedData } = useQuery({
    queryKey: ['test-cases-count', 'assigned'],
    queryFn: () => listTestCases({ status: 'assigned', limit: 1 }),
  });
  const { data: inProgressData } = useQuery({
    queryKey: ['test-cases-count', 'in_progress'],
    queryFn: () => listTestCases({ status: 'in_progress', limit: 1 }),
  });
  const { data: completedData } = useQuery({
    queryKey: ['test-cases-count', 'completed'],
    queryFn: () => listTestCases({ status: 'completed', limit: 1 }),
  });
  const { data: cancelledData } = useQuery({
    queryKey: ['test-cases-count', 'cancelled'],
    queryFn: () => listTestCases({ status: 'cancelled', limit: 1 }),
  });

  const tests = recentTests?.test_cases || [];
  const totalTests = recentTests?.total ?? tests.length;
  const activeTests = (queuedData?.total ?? 0) + (assignedData?.total ?? 0) + (inProgressData?.total ?? 0);
  const completedTests = completedData?.total ?? 0;
  const completionRate = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

  const activityData = generateActivityData(tests);
  const statusCounts: Record<string, number> = {};
  if (queuedData?.total) statusCounts.queued = queuedData.total;
  if (assignedData?.total) statusCounts.assigned = assignedData.total;
  if (inProgressData?.total) statusCounts.in_progress = inProgressData.total;
  if (completedData?.total) statusCounts.completed = completedData.total;
  if (cancelledData?.total) statusCounts.cancelled = cancelledData.total;
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">Overview of your testing activity</p>
        </div>
        <Link
          href="/builder/test-cases/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent-flow text-white text-sm font-medium rounded-md hover:bg-accent-flow/90 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Test Case
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={Activity}
          label="Total Tests"
          value={totalTests}
          subtitle="All time"
          iconColor="bg-accent-flow/15 text-accent-flow"
        />
        <KpiCard
          icon={Clock}
          label="Active Tests"
          value={activeTests}
          subtitle="Queued + Assigned + In Progress"
          iconColor="bg-accent-warning/15 text-accent-warning"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${completedTests} completed`}
          iconColor="bg-accent-review/15 text-accent-review"
        />
        <KpiCard
          icon={Coins}
          label="Credits Available"
          value={balance?.available_credits ?? '...'}
          subtitle={balance && balance.reserved_credits > 0 ? `${balance.reserved_credits} reserved` : undefined}
          iconColor="bg-violet-100 text-violet-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Activity chart */}
        <div className="col-span-2 bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Test Activity</h2>
              <p className="text-xs text-text-muted mt-0.5">Flow vs Review tests — last 14 days</p>
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
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c5fc7" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#6c5fc7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradReview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2ba185" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#2ba185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ece8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9c8fb0' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="flow" stroke="#6c5fc7" strokeWidth={2} fill="url(#gradFlow)" />
                <Area type="monotone" dataKey="review" stroke="#2ba185" strokeWidth={2} fill="url(#gradReview)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-1">Status Breakdown</h2>
          <p className="text-xs text-text-muted mb-4">Current distribution</p>

          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-[13px] text-text-muted">No data yet</p>
            </div>
          ) : (
            <>
              <div className="h-40 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
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

      {/* Recent Tests Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Recent Test Cases</h2>
            <p className="text-xs text-text-muted mt-0.5">{totalTests} total</p>
          </div>
          <Link href="/builder/test-cases" className="text-[13px] text-accent-flow hover:text-accent-flow/80 font-medium">
            View all
          </Link>
        </div>

        {tests.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-text-muted">No test cases yet</p>
            <Link href="/builder/test-cases/new" className="inline-block mt-2 text-sm text-accent-flow font-medium">
              Create your first test
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Title</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Type</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Status</th>
                <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Cost</th>
                <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody>
              {tests.slice(0, 8).map((tc) => (
                <tr key={tc.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/builder/test-cases/${tc.id}`} className="text-sm text-text-primary hover:text-accent-flow font-medium transition-colors">
                      {tc.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                      tc.template_type === 'review_test' ? 'bg-accent-review/10 text-accent-review' : 'bg-accent-flow/10 text-accent-flow'
                    }`}>
                      {tc.template_type === 'review_test' ? 'Review' : 'Flow'}
                    </span>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={tc.status} /></td>
                  <td className="px-5 py-3 text-sm text-text-secondary text-right font-mono">{tc.credit_cost}</td>
                  <td className="px-5 py-3 text-[13px] text-text-muted text-right font-mono">
                    {new Date(tc.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
