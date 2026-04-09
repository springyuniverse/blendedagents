'use client';

import { useState, useMemo, createContext, useContext } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testerApi, type Task, type AvailableTask } from '@/lib/tester-api';
import { DataToolbar, Pagination, applyFilters, type Filter, type FilterKeyDef } from '@/components/DataToolbar';

const ActiveContext = createContext(true);

// ---------------------------------------------------------------------------
// Unified task — normalized from all three API sources
// ---------------------------------------------------------------------------

interface UnifiedTask {
  id: string;
  title: string;
  description: string | null;
  step_count: number;
  environment: string | null;
  tags: string[];
  status: 'available' | 'requested' | 'assigned' | 'in_progress' | 'completed';
  created_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  earnings_cents: number | null;
  request_count: number;
  _source: 'available' | 'my' | 'completed';
  _raw: AvailableTask | Task;
}

function normalize(
  available: AvailableTask[],
  my: Task[],
  completed: (Task & { completed_at: string | null; earnings_cents: number | null })[],
): UnifiedTask[] {
  const seen = new Set<string>();
  const tasks: UnifiedTask[] = [];

  for (const t of my) {
    seen.add(t.id);
    tasks.push({
      id: t.id, title: t.title, description: t.description,
      step_count: t.step_count, environment: t.environment,
      tags: [], status: t.status as UnifiedTask['status'],
      created_at: t.assigned_at || '', assigned_at: t.assigned_at,
      completed_at: null, earnings_cents: null, request_count: 0,
      _source: 'my', _raw: t,
    });
  }

  for (const t of completed) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    tasks.push({
      id: t.id, title: t.title, description: t.description,
      step_count: t.step_count, environment: t.environment,
      tags: [], status: 'completed',
      created_at: t.completed_at || t.assigned_at || '', assigned_at: t.assigned_at,
      completed_at: t.completed_at, earnings_cents: t.earnings_cents, request_count: 0,
      _source: 'completed', _raw: t,
    });
  }

  for (const t of available) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    tasks.push({
      id: t.id, title: t.title, description: t.description,
      step_count: t.step_count, environment: t.environment,
      tags: t.tags, status: t.my_request_status === 'pending' ? 'requested' : 'available',
      created_at: t.created_at, assigned_at: null,
      completed_at: null, earnings_cents: null, request_count: t.request_count,
      _source: 'available', _raw: t,
    });
  }

  return tasks;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PER_PAGE = 10;

const FILTER_KEYS: FilterKeyDef[] = [
  { key: 'status', label: 'Status', type: 'enum', options: ['available', 'requested', 'assigned', 'in_progress', 'completed'] },
  { key: 'environment', label: 'Environment', type: 'enum', options: ['staging', 'production', 'localhost'] },
  { key: 'step_count', label: 'Steps', type: 'number' },
  { key: 'tags', label: 'Tag', type: 'text' },
  { key: 'title', label: 'Title', type: 'text' },
];

const DISPLAY_LABELS: Record<string, Record<string, string>> = {
  status: { available: 'Available', requested: 'Requested', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed' },
};

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-accent-flow/10 text-accent-flow',
  requested: 'bg-amber-100 text-amber-700',
  assigned: 'bg-accent-warning/10 text-accent-warning',
  in_progress: 'bg-accent-review/10 text-accent-review',
  completed: 'bg-surface-secondary text-text-secondary',
};

// ---------------------------------------------------------------------------
// Inline action button
// ---------------------------------------------------------------------------

function InReviewToast({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 shadow-lifted flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
      <p className="text-sm text-amber-800">Your account is in review. You'll be able to take tasks once approved.</p>
      <button onClick={onClose} className="text-amber-600 hover:text-amber-800 text-xs font-medium whitespace-nowrap">Dismiss</button>
    </div>
  );
}

function ActionCell({ task }: { task: UnifiedTask }) {
  const queryClient = useQueryClient();
  const isActive = useContext(ActiveContext);
  const [showToast, setShowToast] = useState(false);

  const requestMutation = useMutation({
    mutationFn: () => testerApi.requestTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tester-tasks'] });
    },
  });
  const withdrawMutation = useMutation({
    mutationFn: () => testerApi.withdrawRequest(task.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['available-tasks'] }),
  });

  const isPending = requestMutation.isPending || withdrawMutation.isPending;

  const handleInReview = () => setShowToast(true);

  if (task.status === 'requested') {
    return (
      <button onClick={() => withdrawMutation.mutate()} disabled={isPending}
        className="px-2.5 py-1 border border-border text-text-secondary text-xs font-medium rounded-md hover:bg-surface-secondary disabled:opacity-50 transition-colors whitespace-nowrap">
        {withdrawMutation.isPending ? '...' : 'Withdraw'}
      </button>
    );
  }
  if (task.status === 'available') {
    return (
      <>
        <button onClick={isActive ? () => requestMutation.mutate() : handleInReview} disabled={isPending}
          className={`px-2.5 py-1 text-xs font-medium rounded-md disabled:opacity-50 transition-colors whitespace-nowrap ${
            isActive
              ? 'bg-accent-review text-white hover:bg-accent-review/90'
              : 'bg-surface-secondary text-text-secondary border border-border hover:bg-surface-secondary/80'
          }`}>
          {requestMutation.isPending ? '...' : 'Request'}
        </button>
        {showToast && <InReviewToast onClose={() => setShowToast(false)} />}
      </>
    );
  }
  if (task.status === 'assigned' || task.status === 'in_progress') {
    if (!isActive) {
      return (
        <>
          <button onClick={handleInReview}
            className="px-2.5 py-1 bg-surface-secondary text-text-secondary border border-border text-xs font-medium rounded-md hover:bg-surface-secondary/80 transition-colors whitespace-nowrap">
            {task.status === 'assigned' ? 'Start' : 'Continue'}
          </button>
          {showToast && <InReviewToast onClose={() => setShowToast(false)} />}
        </>
      );
    }
    return (
      <Link href={`/tester/tasks/${task.id}`}
        className="px-2.5 py-1 bg-accent-flow text-white text-xs font-medium rounded-md hover:bg-accent-flow/90 transition-colors whitespace-nowrap">
        {task.status === 'assigned' ? 'Start' : 'Continue'}
      </Link>
    );
  }
  if (task.status === 'completed') {
    return (
      <Link href={`/tester/tasks/${task.id}`}
        className="px-2.5 py-1 border border-border text-text-secondary text-xs font-medium rounded-md hover:bg-surface-secondary transition-colors whitespace-nowrap">
        View
      </Link>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [page, setPage] = useState(1);

  const { data: profile } = useQuery({
    queryKey: ['tester-profile'],
    queryFn: () => testerApi.getProfile(),
    staleTime: 30_000,
  });
  const accountActive = profile?.is_active ?? false;

  // All three fetches use server-side search + pagination
  const { data: availableData, isLoading: aL } = useQuery({
    queryKey: ['available-tasks', { search, page }],
    queryFn: () => testerApi.getAvailableTasks({ search: search || undefined, page, limit: PER_PAGE }),
    refetchInterval: 5000,
  });
  const { data: myData, isLoading: mL } = useQuery({
    queryKey: ['tester-tasks', { search, page }],
    queryFn: () => testerApi.getTasks({ search: search || undefined, page, limit: PER_PAGE }),
    refetchInterval: 5000,
  });
  const { data: completedData, isLoading: cL } = useQuery({
    queryKey: ['tester-completed', { search, page }],
    queryFn: () => testerApi.getCompletedTasks({ search: search || undefined, page, limit: PER_PAGE }),
    refetchInterval: 10000,
  });

  const isLoading = aL || mL || cL;

  const allTasks = useMemo(
    () => normalize(availableData?.tasks || [], myData?.tasks || [], completedData?.tasks || []),
    [availableData, myData, completedData],
  );

  // Client-side filters (status/env/tags filters on the merged data)
  const activeFilters = filters.filter((f) => f.value);
  const filtered = activeFilters.length > 0 ? applyFilters(allTasks, activeFilters) : allTasks;

  // Server totals
  const totalAvailable = availableData?.total ?? 0;
  const totalMy = myData?.total ?? 0;
  const totalCompleted = completedData?.total ?? 0;
  const serverTotal = totalAvailable + totalMy + totalCompleted;
  const maxPages = Math.max(availableData?.total_pages ?? 1, myData?.total_pages ?? 1, completedData?.total_pages ?? 1);

  return (
    <ActiveContext.Provider value={accountActive}>
    <div className="space-y-5">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Tasks</h1>
          <p className="text-sm text-text-secondary mt-0.5">{serverTotal} total</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-review" />
            <span className="text-text-secondary">{totalMy} active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-flow" />
            <span className="text-text-secondary">{totalAvailable} available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-surface-secondary border border-border" />
            <span className="text-text-secondary">{totalCompleted} done</span>
          </div>
        </div>
      </div>

      {/* Search + Filters + Quick filters */}
      <DataToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search tasks..."
        filterKeys={FILTER_KEYS}
        filters={filters}
        onFiltersChange={(f) => { setFilters(f); setPage(1); }}
        displayLabels={DISPLAY_LABELS}
        quickFilters={[
          { label: 'My active', filters: [{ key: 'status', operator: 'is_not', value: 'available' }, { key: 'status', operator: 'is_not', value: 'completed' }] },
          { label: 'Available', filters: [{ key: 'status', operator: 'is', value: 'available' }] },
          { label: 'Completed', filters: [{ key: 'status', operator: 'is', value: 'completed' }] },
        ]}
        totalItems={activeFilters.length > 0 ? filtered.length : serverTotal}
      />

      {/* Table */}
      {isLoading ? (
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-surface-secondary rounded" />)}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg px-5 py-12 text-center">
          <p className="text-sm text-text-secondary">
            {search || activeFilters.length > 0 ? 'No tasks match your filters' : 'No tasks yet'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {search || activeFilters.length > 0 ? 'Try adjusting your search or filters.' : 'Tasks will appear here when builders publish test cases.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-text-muted px-4 py-2.5">Task</th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-2.5 w-28">Status</th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-2.5 w-20">Steps</th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-2.5 w-24">Env</th>
                <th className="text-right text-xs font-medium text-text-muted px-4 py-2.5 w-24">Date</th>
                <th className="text-right text-xs font-medium text-text-muted px-4 py-2.5 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      {task.status === 'assigned' || task.status === 'in_progress' || task.status === 'completed' ? (
                        <Link href={`/tester/tasks/${task.id}`}
                          className="text-sm font-medium text-text-primary hover:text-accent-review transition-colors">
                          {task.title}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-text-primary">{task.title}</span>
                      )}
                      {task.description && (
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-1 max-w-md">{task.description}</p>
                      )}
                    </div>
                    {task.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {task.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-accent-review/8 text-accent-review text-[11px] rounded font-medium">{tag}</span>
                        ))}
                        {task.tags.length > 3 && <span className="text-[11px] text-text-muted">+{task.tags.length - 3}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[task.status] || STATUS_STYLES.available}`}>
                      {DISPLAY_LABELS.status[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{task.step_count}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{task.environment || '—'}</td>
                  <td className="px-4 py-3 text-xs text-text-muted text-right whitespace-nowrap">
                    {task.completed_at ? new Date(task.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                      : task.assigned_at ? new Date(task.assigned_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                      : task.created_at ? new Date(task.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                      : '—'}
                    {task.earnings_cents != null && task.earnings_cents > 0 && (
                      <span className="ml-2 text-accent-review font-medium">+${(task.earnings_cents / 100).toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionCell task={task} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={maxPages} totalItems={serverTotal} perPage={PER_PAGE} onPageChange={setPage} />
    </div>
    </ActiveContext.Provider>
  );
}
