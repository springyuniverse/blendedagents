'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminTestCases, getActiveTesters, reassignTestCase, type AdminTestCase, type AdminTester } from '@/lib/admin-api';
import { StatusBadge } from '@/components/StatusBadge';
import { DataToolbar, type Filter, type FilterKeyDef, type QuickFilter } from '@/components/DataToolbar';
import { User, UserCheck, RefreshCw, Check, X } from 'lucide-react';

const FILTER_KEYS: FilterKeyDef[] = [
  { key: 'status', label: 'Status', type: 'enum', options: ['queued', 'assigned', 'in_progress', 'submitted', 'completed', 'cancelled', 'expired'] },
  { key: 'template_type', label: 'Type', type: 'enum', options: ['flow_test', 'review_test'] },
  { key: 'credit_cost', label: 'Credit Cost', type: 'number' },
  { key: 'builder_name', label: 'Builder', type: 'text' },
  { key: 'tester_name', label: 'Tester', type: 'text' },
];

const DISPLAY_LABELS: Record<string, Record<string, string>> = {
  status: { queued: 'Queued', assigned: 'Assigned', in_progress: 'In Progress', submitted: 'Submitted', completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired' },
  template_type: { flow_test: 'Flow', review_test: 'Review' },
};

const QUICK_FILTERS: QuickFilter[] = [
  { label: 'Active', filters: [{ key: 'status', operator: 'is', value: 'in_progress' }] },
  { label: 'Completed', filters: [{ key: 'status', operator: 'is', value: 'completed' }] },
  { label: 'Queued', filters: [{ key: 'status', operator: 'is', value: 'queued' }] },
  { label: 'Flow only', filters: [{ key: 'template_type', operator: 'is', value: 'flow_test' }] },
  { label: 'Review only', filters: [{ key: 'template_type', operator: 'is', value: 'review_test' }] },
];

function ReassignModal({ testCase, onClose }: { testCase: AdminTestCase; onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedTester, setSelectedTester] = useState('');
  const [reason, setReason] = useState('');

  const { data: testersData, isLoading: testersLoading } = useQuery({
    queryKey: ['admin-active-testers'],
    queryFn: () => getActiveTesters(),
  });

  const mutation = useMutation({
    mutationFn: () => reassignTestCase(testCase.id, selectedTester, reason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-test-cases'] });
      onClose();
    },
  });

  const activeTesters = (testersData?.testers ?? []).filter((t: AdminTester) => t.is_active && t.onboarded);
  const inputClass = 'w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-admin/50 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-lifted w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-text-primary">Reassign Test Case</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="mb-4 px-3 py-2 bg-surface-secondary rounded-lg">
          <p className="text-xs text-text-muted">Test Case</p>
          <p className="text-sm text-text-primary font-medium truncate">{testCase.title}</p>
          {testCase.tester_name && (
            <p className="text-xs text-text-secondary mt-1">Currently assigned to: <span className="font-medium">{testCase.tester_name}</span></p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">New Tester</label>
            {testersLoading ? (
              <p className="text-xs text-text-muted py-2">Loading testers...</p>
            ) : (
              <select value={selectedTester} onChange={e => setSelectedTester(e.target.value)} className={inputClass}>
                <option value="" disabled>Select a tester</option>
                {activeTesters.map((t: AdminTester) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name} — {t.region?.toUpperCase()} ({t.tasks_completed} tasks, {t.avg_completion_minutes > 0 ? `${Math.round(t.avg_completion_minutes)}m avg` : 'no avg'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Reason (optional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Tester unresponsive"
              className={inputClass} />
          </div>

          {mutation.isError && (
            <p className="text-[13px] text-accent-danger">{(mutation.error as Error).message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!selectedTester || mutation.isPending}
            className="px-4 py-2 bg-accent-admin text-white text-sm font-medium rounded-lg hover:bg-accent-admin/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
            {mutation.isPending ? 'Reassigning...' : 'Reassign'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTestCasesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [reassigning, setReassigning] = useState<AdminTestCase | null>(null);

  // Extract server-side filters from the filter list
  const statusFilter = filters.find(f => f.key === 'status' && f.operator === 'is')?.value || '';
  const typeFilter = filters.find(f => f.key === 'template_type' && f.operator === 'is')?.value || '';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-test-cases', page, search, statusFilter, typeFilter],
    queryFn: () => getAdminTestCases({
      page,
      limit: 15,
      search: search || undefined,
      status: statusFilter || undefined,
      template_type: typeFilter || undefined,
    }),
  });

  // Client-side filtering for non-server filters (builder_name, tester_name, credit_cost)
  const clientFilters = filters.filter(f => !['status', 'template_type'].includes(f.key));
  let displayedTests = data?.test_cases ?? [];
  if (clientFilters.length > 0) {
    displayedTests = displayedTests.filter(tc =>
      clientFilters.every(f => {
        const raw = (tc as unknown as Record<string, unknown>)[f.key];
        const val = String(raw ?? '');
        switch (f.operator) {
          case 'is': return val === f.value;
          case 'is_not': return val !== f.value;
          case 'contains': return val.toLowerCase().includes(f.value.toLowerCase());
          case 'gt': return Number(val) > Number(f.value);
          case 'lt': return Number(val) < Number(f.value);
          default: return true;
        }
      })
    );
  }

  const canReassign = (tc: AdminTestCase) => ['assigned', 'in_progress'].includes(tc.status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Test Cases</h1>
        <p className="text-sm text-text-muted mt-0.5">All test cases across the platform</p>
      </div>

      <DataToolbar
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search by title, builder name, or email..."
        filterKeys={FILTER_KEYS}
        filters={filters}
        onFiltersChange={(f) => { setFilters(f); setPage(1); }}
        displayLabels={DISPLAY_LABELS}
        quickFilters={QUICK_FILTERS}
        page={page}
        totalPages={data?.total_pages}
        totalItems={data?.total}
        perPage={data?.per_page}
        onPageChange={setPage}
      />

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Title</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Builder</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Tester</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Cost</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Created</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {displayedTests.map(tc => (
                  <tr key={tc.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-text-primary truncate max-w-[240px]">{tc.title}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                        tc.template_type === 'review_test' ? 'bg-accent-review/10 text-accent-review' : 'bg-accent-flow/10 text-accent-flow'
                      }`}>
                        {tc.template_type === 'review_test' ? 'Review' : 'Flow'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={tc.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                        <span className="text-sm text-text-secondary truncate max-w-[120px]">{tc.builder_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {tc.tester_name ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-accent-review" strokeWidth={1.5} />
                          <span className="text-sm text-text-secondary truncate max-w-[120px]">{tc.tester_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-text-primary font-mono">{tc.credit_cost}</td>
                    <td className="px-5 py-3.5 text-right text-[13px] text-text-muted font-mono">
                      {new Date(tc.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canReassign(tc) && (
                        <button onClick={() => setReassigning(tc)}
                          className="text-text-muted hover:text-accent-admin p-1.5 rounded-md hover:bg-accent-admin/8 transition-colors"
                          title="Reassign tester">
                          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {displayedTests.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-text-muted">
                      {search || filters.length > 0 ? 'No test cases match your filters.' : 'No test cases yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reassigning && <ReassignModal testCase={reassigning} onClose={() => setReassigning(null)} />}
    </div>
  );
}
