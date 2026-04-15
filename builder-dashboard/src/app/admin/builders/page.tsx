'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminBuilders, updateBuilder, type AdminBuilder } from '@/lib/admin-api';
import { DataToolbar, type Filter, type FilterKeyDef, type QuickFilter } from '@/components/DataToolbar';
import { X, Pencil, Check, Coins, Key, ClipboardList } from 'lucide-react';

const PLAN_TIERS = ['starter', 'pro', 'team'];

const FILTER_KEYS: FilterKeyDef[] = [
  { key: 'plan_tier', label: 'Plan', type: 'enum', options: ['starter', 'pro', 'team'] },
  { key: 'test_count', label: 'Test Count', type: 'number' },
  { key: 'credits_available', label: 'Credits', type: 'number' },
  { key: 'active_api_keys', label: 'API Keys', type: 'number' },
  { key: 'display_name', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
];

const DISPLAY_LABELS: Record<string, Record<string, string>> = {
  plan_tier: { starter: 'Starter', pro: 'Pro', team: 'Team' },
};

const QUICK_FILTERS: QuickFilter[] = [
  { label: 'Pro', filters: [{ key: 'plan_tier', operator: 'is', value: 'pro' }] },
  { label: 'Team', filters: [{ key: 'plan_tier', operator: 'is', value: 'team' }] },
  { label: 'Has tests', filters: [{ key: 'test_count', operator: 'gt', value: '0' }] },
  { label: 'Has credits', filters: [{ key: 'credits_available', operator: 'gt', value: '0' }] },
];

function EditBuilderModal({ builder, onClose }: { builder: AdminBuilder; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(builder.display_name);
  const [plan, setPlan] = useState(builder.plan_tier);

  const mutation = useMutation({
    mutationFn: () => updateBuilder(builder.id, { display_name: name, plan_tier: plan }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-builders'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-lifted w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-text-primary">Edit Builder</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-admin/50 focus:border-accent-admin/50 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Plan Tier</label>
            <div className="flex gap-2">
              {PLAN_TIERS.map(t => (
                <button key={t} onClick={() => setPlan(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    plan === t ? 'bg-accent-admin text-white' : 'bg-surface-secondary text-text-secondary border border-border hover:bg-surface-secondary/80'
                  }`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Email</label>
            <p className="text-sm text-text-muted">{builder.email}</p>
          </div>
          {mutation.isError && <p className="text-[13px] text-accent-danger">{(mutation.error as Error).message}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="px-4 py-2 bg-accent-admin text-white text-sm font-medium rounded-lg hover:bg-accent-admin/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBuildersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [editing, setEditing] = useState<AdminBuilder | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-builders', page, search],
    queryFn: () => getAdminBuilders({ page, limit: 15, search: search || undefined }),
  });

  // Client-side filtering (plan_tier, test_count, credits, etc.)
  const activeFilters = filters.filter(f => f.value);
  let displayedBuilders = data?.builders ?? [];
  if (activeFilters.length > 0) {
    displayedBuilders = displayedBuilders.filter(b =>
      activeFilters.every(f => {
        const raw = (b as unknown as Record<string, unknown>)[f.key];
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Builders</h1>
        <p className="text-sm text-text-muted mt-0.5">Manage all builder accounts</p>
      </div>

      <DataToolbar
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search by name or email..."
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
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Builder</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Plan</th>
                  <th className="text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Tests</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Credits</th>
                  <th className="text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">API Keys</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Last Login</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Joined</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {displayedBuilders.map(b => (
                  <tr key={b.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{b.display_name}</p>
                        <p className="text-xs text-text-muted">{b.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                        b.plan_tier === 'team' ? 'bg-accent-flow/10 text-accent-flow'
                        : b.plan_tier === 'pro' ? 'bg-accent-admin/10 text-accent-admin'
                        : 'bg-surface-secondary text-text-muted'
                      }`}>{b.plan_tier}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm text-text-primary font-mono">
                        <ClipboardList className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />{b.test_count}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm text-text-primary font-mono">
                        <Coins className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />{b.credits_available}
                        {b.credits_reserved > 0 && <span className="text-xs text-text-muted">({b.credits_reserved} held)</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm text-text-primary font-mono">
                        <Key className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />{b.active_api_keys}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-[13px] font-mono">
                      {b.last_login_at ? (
                        <span className="text-text-primary">{new Date(b.last_login_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                      ) : (
                        <span className="text-text-muted">Never</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[13px] text-text-muted font-mono">
                      {new Date(b.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setEditing(b)}
                        className="text-text-muted hover:text-accent-admin p-1.5 rounded-md hover:bg-accent-admin/8 transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedBuilders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-text-muted">
                      {search || filters.length > 0 ? 'No builders match your filters.' : 'No builders yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <EditBuilderModal builder={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
