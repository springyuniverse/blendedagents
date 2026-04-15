'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminTesters, updateTester, type AdminTester } from '@/lib/admin-api';
import { DataToolbar, type Filter, type FilterKeyDef, type QuickFilter } from '@/components/DataToolbar';
import { Pencil, Check, Shield, ShieldOff, Clock, DollarSign, MapPin, X } from 'lucide-react';

const FILTER_KEYS: FilterKeyDef[] = [
  { key: 'status', label: 'Status', type: 'enum', options: ['active', 'inactive', 'pending'] },
  { key: 'region', label: 'Region', type: 'text' },
  { key: 'tasks_completed', label: 'Tasks Completed', type: 'number' },
  { key: 'earnings_cents', label: 'Earnings (cents)', type: 'number' },
  { key: 'onboarded', label: 'Onboarded', type: 'enum', options: ['true', 'false'] },
  { key: 'is_available', label: 'Available', type: 'enum', options: ['true', 'false'] },
];

const DISPLAY_LABELS: Record<string, Record<string, string>> = {
  status: { active: 'Active', inactive: 'Inactive', pending: 'Pending' },
  onboarded: { true: 'Yes', false: 'No' },
  is_available: { true: 'Online', false: 'Offline' },
};

const QUICK_FILTERS: QuickFilter[] = [
  { label: 'Active', filters: [{ key: 'status', operator: 'is', value: 'active' }] },
  { label: 'Inactive', filters: [{ key: 'status', operator: 'is', value: 'inactive' }] },
  { label: 'Pending', filters: [{ key: 'status', operator: 'is', value: 'pending' }] },
  { label: 'Has earnings', filters: [{ key: 'earnings_cents', operator: 'gt', value: '0' }] },
  { label: 'Not onboarded', filters: [{ key: 'onboarded', operator: 'is', value: 'false' }] },
];

function TesterStatusBadge({ tester }: { tester: AdminTester }) {
  if (!tester.onboarded) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-accent-warning/10 text-accent-warning">Pending</span>;
  }
  return tester.is_active
    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-accent-review/10 text-accent-review">Active</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-accent-danger/10 text-accent-danger">Inactive</span>;
}

function OnboardedBadge({ onboarded }: { onboarded: boolean }) {
  return onboarded
    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-accent-review/10 text-accent-review">Yes</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-accent-warning/10 text-accent-warning">No</span>;
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  const add = () => { const t = input.trim(); if (t && !value.includes(t)) { onChange([...value, t]); setInput(''); } };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-admin/8 text-accent-admin text-[11px] font-medium rounded">
            {tag}<button onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-accent-danger"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-admin/50 transition-all" />
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-text-primary">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent-admin' : 'bg-surface-secondary border border-border'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}

function EditTesterModal({ tester, onClose }: { tester: AdminTester; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(tester.display_name);
  const [region, setRegion] = useState(tester.region);
  const [timezone, setTimezone] = useState(tester.timezone ?? '');
  const [onboarded, setOnboarded] = useState(tester.onboarded);
  const [isActive, setIsActive] = useState(tester.is_active);
  const [isAvailable, setIsAvailable] = useState(tester.is_available);
  const [maxInvites, setMaxInvites] = useState(tester.max_invites ?? 0);
  const [skills, setSkills] = useState<string[]>(tester.skills ?? []);
  const [languages, setLanguages] = useState<string[]>(tester.languages ?? []);
  const [devices, setDevices] = useState<string[]>(tester.devices ?? []);

  const mutation = useMutation({
    mutationFn: () => updateTester(tester.id, {
      display_name: name, region, timezone: timezone || null,
      onboarded, is_active: isActive, is_available: isAvailable,
      skills, languages, devices, max_invites: maxInvites,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-testers'] }); onClose(); },
  });

  const inputClass = "w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-admin/50 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-lifted w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-text-primary">Edit Tester</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Email</label>
            <p className="text-sm text-text-muted px-3 py-2">{tester.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Region</label>
              <input value={region} onChange={e => setRegion(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Timezone</label>
              <input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="e.g. America/New_York" className={inputClass} />
            </div>
          </div>
          <div className="border border-border rounded-lg p-4 space-y-3">
            <ToggleSwitch checked={isActive} onChange={setIsActive} label="Active" />
            <ToggleSwitch checked={onboarded} onChange={setOnboarded} label="Onboarded" />
            <ToggleSwitch checked={isAvailable} onChange={setIsAvailable} label="Available" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Max Invites</label>
            <input type="number" min={0} max={100} value={maxInvites}
              onChange={e => setMaxInvites(parseInt(e.target.value) || 0)}
              className={inputClass} />
            <p className="text-xs text-text-muted mt-0.5">Number of invite codes this tester can generate</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Skills</label>
            <TagInput value={skills} onChange={setSkills} placeholder="Add skill and press Enter" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Languages</label>
            <TagInput value={languages} onChange={setLanguages} placeholder="Add language and press Enter" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Devices</label>
            <TagInput value={devices} onChange={setDevices} placeholder="Add device and press Enter" />
          </div>
          {mutation.isError && <p className="text-[13px] text-accent-danger">{(mutation.error as Error).message}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="px-4 py-2 bg-accent-admin text-white text-sm font-medium rounded-lg hover:bg-accent-admin/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            <Check className="w-3.5 h-3.5" strokeWidth={2} />{mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTestersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [editing, setEditing] = useState<AdminTester | null>(null);

  // Extract server-side status filter
  const statusFilter = filters.find(f => f.key === 'status' && f.operator === 'is')?.value || '';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-testers', page, search, statusFilter],
    queryFn: () => getAdminTesters({ page, limit: 15, search: search || undefined, status: statusFilter || undefined }),
  });

  const toggleActivation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateTester(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-testers'] }),
  });

  // Client-side filtering for non-server filters
  const clientFilters = filters.filter(f => f.key !== 'status' && f.value);
  let displayedTesters = data?.testers ?? [];
  if (clientFilters.length > 0) {
    displayedTesters = displayedTesters.filter(t =>
      clientFilters.every(f => {
        const raw = (t as unknown as Record<string, unknown>)[f.key];
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
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Testers</h1>
        <p className="text-sm text-text-muted mt-0.5">Manage all tester accounts and activations</p>
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
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Tester</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Onboarded</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Region</th>
                  <th className="text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Tasks</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Avg Time</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Earnings</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Last Login</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Joined</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {displayedTesters.map(t => (
                  <tr key={t.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/testers/${t.id}`} className="block group">
                        <p className="text-sm font-medium text-text-primary group-hover:text-accent-admin transition-colors">{t.display_name}</p>
                        <p className="text-xs text-text-muted">{t.email}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5"><TesterStatusBadge tester={t} /></td>
                    <td className="px-5 py-3.5 text-center"><OnboardedBadge onboarded={t.onboarded} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                        <MapPin className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                        {t.region?.toUpperCase() || '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center text-sm font-mono text-text-primary">{t.tasks_completed}/{t.tasks_total}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 text-sm text-text-secondary font-mono">
                        <Clock className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                        {t.avg_completion_minutes > 0 ? `${Math.round(t.avg_completion_minutes)}m` : '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 text-sm text-text-primary font-mono">
                        <DollarSign className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                        {(t.earnings_cents / 100).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-[13px] font-mono">
                      {t.last_login_at ? (
                        <span className="text-text-primary">{new Date(t.last_login_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                      ) : (
                        <span className="text-text-muted">Never</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[13px] text-text-muted font-mono">
                      {new Date(t.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleActivation.mutate({ id: t.id, is_active: !t.is_active })}
                          disabled={toggleActivation.isPending}
                          className={`p-1.5 rounded-md transition-colors ${
                            t.is_active ? 'text-accent-danger hover:bg-accent-danger/8' : 'text-accent-review hover:bg-accent-review/8'
                          }`}
                          title={t.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {t.is_active ? <ShieldOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />}
                        </button>
                        <button onClick={() => setEditing(t)}
                          className="text-text-muted hover:text-accent-admin p-1.5 rounded-md hover:bg-accent-admin/8 transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayedTesters.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-sm text-text-muted">
                      {search || filters.length > 0 ? 'No testers match your filters.' : 'No testers yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <EditTesterModal tester={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
