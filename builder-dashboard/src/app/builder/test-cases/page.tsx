'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTestCases, updateTestCaseStatus, type TestCase } from '@/lib/api';
import { TestCaseDialog } from '@/components/TestCaseDialog';
import { Layers, Coins, CheckCircle2, GripVertical, LayoutGrid, List } from 'lucide-react';
import { DataToolbar, Pagination, applyFilters, type Filter, type FilterKeyDef } from '@/components/DataToolbar';

const COLUMNS = [
  { key: 'queued', label: 'Queued', border: 'border-t-slate-400', bg: 'bg-surface-secondary/50', dot: 'bg-slate-400', headerBg: 'bg-surface-secondary', dropRing: 'ring-slate-500' },
  { key: 'assigned', label: 'Assigned', border: 'border-t-indigo-400', bg: 'bg-accent-flow/5', dot: 'bg-indigo-400', headerBg: 'bg-accent-flow/10', dropRing: 'ring-indigo-500' },
  { key: 'in_progress', label: 'In Progress', border: 'border-t-amber-400', bg: 'bg-accent-warning/5', dot: 'bg-amber-400', headerBg: 'bg-accent-warning/10', dropRing: 'ring-amber-500' },
  { key: 'completed', label: 'Completed', border: 'border-t-emerald-400', bg: 'bg-accent-review/5', dot: 'bg-emerald-400', headerBg: 'bg-accent-review/10', dropRing: 'ring-emerald-500' },
  { key: 'cancelled', label: 'Cancelled', border: 'border-t-red-400', bg: 'bg-accent-danger/5', dot: 'bg-red-400', headerBg: 'bg-accent-danger/10', dropRing: 'ring-red-500' },
] as const;

const VIEW_MODES = ['board', 'list'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

// ---------------------------------------------------------------------------
// Draggable Card
// ---------------------------------------------------------------------------

function DraggableCard({ tc, onOpen }: { tc: TestCase; onOpen: (id: string) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragTriggered = useRef(false);
  const stepCount = tc.step_count ?? tc.steps?.length ?? 0;
  const isReview = tc.template_type === 'review_test';
  const hasResult = tc.status === 'completed';

  const handleDragStart = (e: React.DragEvent) => {
    dragTriggered.current = false;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ itemId: tc.id, fromStatus: tc.status }),
    );
    requestAnimationFrame(() => {
      dragTriggered.current = true;
      setIsDragging(true);
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (dragTriggered.current) return;
    onOpen(tc.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`
        group relative bg-surface rounded-lg border border-border p-3
        shadow-soft cursor-grab active:cursor-grabbing
        hover:shadow-lifted
        transition-all duration-200 select-none
        ${isDragging ? 'opacity-40 scale-[0.97] rotate-[0.5deg]' : ''}
      `}
    >
      {/* Drag handle hint */}
      <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-3.5 h-3.5 text-text-muted" />
      </div>

      {/* Title row */}
      <div className="flex items-start gap-2 pr-5">
        <h4 className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-accent-flow transition-colors">
          {tc.title}
        </h4>
        {hasResult && (
          <CheckCircle2 className="w-4 h-4 text-accent-review flex-shrink-0 mt-0.5" />
        )}
      </div>
      {/* Template type */}
      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${
        tc.template_type === 'review_test' ? 'bg-accent-review/10 text-accent-review' : 'bg-accent-flow/10 text-accent-flow'
      }`}>
        {tc.template_type === 'review_test' ? 'Review' : 'Flow'}
      </span>

      {/* Description */}
      {tc.description && (
        <p className="text-xs text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">{tc.description}</p>
      )}

      {/* Tags */}
      {tc.tags && tc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tc.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-accent-flow/10 text-accent-flow text-[11px] rounded-md font-medium"
            >
              {tag}
            </span>
          ))}
          {tc.tags.length > 3 && (
            <span className="text-[11px] text-text-muted">+{tc.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" strokeWidth={1.5} />
            {isReview ? 'Review' : `${stepCount} steps`}
          </span>
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3" strokeWidth={1.5} />
            {tc.credit_cost}
          </span>
        </div>
        <span className="text-[11px] text-text-muted">
          {new Date(tc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban Column (drop zone)
// ---------------------------------------------------------------------------

function KanbanColumn({
  column,
  items,
  isLoading,
  onDrop,
  onOpen,
}: {
  column: (typeof COLUMNS)[number];
  items: TestCase[];
  isLoading: boolean;
  onDrop: (itemId: string, fromStatus: string, toStatus: string) => void;
  onOpen: (id: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.itemId && data.fromStatus !== column.key) {
          onDrop(data.itemId, data.fromStatus, column.key);
        }
      } catch {
        /* ignore malformed data */
      }
    },
    [column.key, onDrop],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex flex-col min-w-[270px] max-w-[300px] flex-1
        rounded-lg border border-border border-t-[3px]
        ${column.border} ${column.bg}
        transition-all duration-200
        ${isDragOver ? `ring-2 ${column.dropRing} ring-offset-1 ring-offset-surface bg-surface/80 scale-[1.01]` : ''}
      `}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 ${column.headerBg} rounded-t-[5px]`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${column.dot}`} />
          <span className="text-xs font-semibold text-text-primary">{column.label}</span>
        </div>
        <span className="text-xs text-text-muted font-medium tabular-nums min-w-[20px] text-center bg-surface/80 rounded-full px-1.5 py-0.5">
          {items.length}
        </span>
      </div>

      {/* Cards container */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-surface rounded-lg border border-border p-3 animate-pulse">
                <div className="h-3 bg-surface-secondary rounded w-3/4 mb-2" />
                <div className="h-2 bg-surface-secondary rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={`
            flex flex-col items-center justify-center py-8 text-center
            transition-all duration-200
            ${isDragOver ? 'py-12' : ''}
          `}>
            {isDragOver ? (
              <>
                <div className="w-10 h-10 rounded-lg bg-accent-flow/10 flex items-center justify-center mb-2 animate-pulse">
                  <svg className="w-5 h-5 text-accent-flow" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-accent-flow">Drop here</p>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3 0H9.75m0 0H9.75m6.75 0l.008-.008" />
                  </svg>
                </div>
                <p className="text-xs text-text-muted">No tests</p>
              </>
            )}
          </div>
        ) : (
          items.map((tc) => <DraggableCard key={tc.id} tc={tc} onOpen={onOpen} />)
        )}

        {/* Drop indicator when column has items */}
        {isDragOver && items.length > 0 && (
          <div className="border-2 border-dashed border-accent-flow/40 rounded-lg p-3 flex items-center justify-center transition-all">
            <p className="text-xs font-medium text-accent-flow">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------

function ListView({ tests, isLoading, onOpen }: { tests: TestCase[]; isLoading: boolean; onOpen: (id: string) => void }) {
  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-lg shadow-soft p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-surface-secondary rounded" />)}
        </div>
      </div>
    );
  }

  if (tests.length === 0) {
    return <div className="bg-surface border border-border rounded-lg shadow-soft px-5 py-8 text-center text-sm text-text-secondary">No test cases found</div>;
  }

  return (
    <div className="bg-surface border border-border rounded-lg shadow-soft overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-medium text-text-secondary px-5 py-2.5">Title</th>
            <th className="text-left text-xs font-medium text-text-secondary px-5 py-2.5">Status</th>
            <th className="text-right text-xs font-medium text-text-secondary px-5 py-2.5">Steps</th>
            <th className="text-right text-xs font-medium text-text-secondary px-5 py-2.5">Cost</th>
            <th className="text-right text-xs font-medium text-text-secondary px-5 py-2.5">Created</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((tc) => (
            <tr key={tc.id} className="border-b border-border-subtle hover:bg-surface-secondary transition-colors">
              <td className="px-5 py-3">
                <button onClick={() => onOpen(tc.id)} className="text-sm text-accent-flow hover:text-accent-flow/80 font-medium text-left">
                  {tc.title}
                </button>
                {tc.description && (
                  <p className="text-xs text-text-secondary mt-0.5 truncate max-w-xs">{tc.description}</p>
                )}
              </td>
              <td className="px-5 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  { queued: 'bg-surface-secondary text-text-primary', assigned: 'bg-accent-flow/10 text-accent-flow', in_progress: 'bg-accent-warning/10 text-accent-warning', completed: 'bg-accent-review/10 text-accent-review', cancelled: 'bg-accent-danger/10 text-accent-danger' }[tc.status] || 'bg-surface-secondary text-text-secondary'
                }`}>
                  {{ queued: 'Queued', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }[tc.status] || tc.status}
                </span>
              </td>
              <td className="px-5 py-3 text-sm text-text-secondary text-right">{tc.step_count ?? tc.steps?.length ?? '--'}</td>
              <td className="px-5 py-3 text-sm text-text-secondary text-right">{tc.credit_cost}</td>
              <td className="px-5 py-3 text-sm text-text-secondary text-right">
                {new Date(tc.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

const FILTER_KEYS: FilterKeyDef[] = [
  { key: 'status', label: 'Status', type: 'enum', options: ['queued', 'assigned', 'in_progress', 'completed', 'cancelled'] },
  { key: 'template_type', label: 'Type', type: 'enum', options: ['flow_test', 'review_test'] },
  { key: 'credit_cost', label: 'Cost', type: 'number' },
  { key: 'tags', label: 'Tag', type: 'text' },
  { key: 'environment', label: 'Environment', type: 'enum', options: ['staging', 'production', 'localhost'] },
  { key: 'title', label: 'Title', type: 'text' },
];

const DISPLAY_LABELS: Record<string, Record<string, string>> = {
  status: { queued: 'Queued', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' },
  template_type: { flow_test: 'Flow', review_test: 'Review' },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PER_PAGE = 10;

export default function TestCasesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const queryKey = ['test-cases', { search, page }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listTestCases({ search: search || undefined, page, limit: PER_PAGE }),
    refetchInterval: 5000,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTestCaseStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['test-cases'] });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(
        queryKey,
        (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            test_cases: old.test_cases.map((tc: TestCase) =>
              tc.id === id ? { ...tc, status } : tc,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
    },
  });

  const handleDrop = useCallback(
    (itemId: string, _fromStatus: string, toStatus: string) => {
      moveMutation.mutate({ id: itemId, status: toStatus });
    },
    [moveMutation],
  );

  const allTests = data?.test_cases || [];
  const serverTotal = data?.total ?? allTests.length;
  const totalPages = data?.total_pages ?? 1;
  const activeFilters = filters.filter((f) => f.value);
  const filtered = activeFilters.length > 0 ? applyFilters(allTests, activeFilters) : allTests;

  // Group by status for kanban columns
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filtered.filter((tc) => tc.status === col.key);
    return acc;
  }, {} as Record<string, TestCase[]>);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Test Cases</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {activeFilters.length > 0 ? `${filtered.length} of ${serverTotal}` : serverTotal} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-surface-secondary rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'board' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              title="Board view"
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              title="List view"
            >
              <List className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
          <Link href="/builder/templates" className="px-3 py-1.5 border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-secondary hover:border-border transition-all duration-200">
            From Template
          </Link>
          <Link href="/builder/test-cases/new" className="px-3 py-1.5 bg-accent-flow text-white text-sm font-medium rounded-lg transition-all duration-200">
            Create Test
          </Link>
        </div>
      </div>

      <DataToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search test cases..."
        filterKeys={FILTER_KEYS}
        filters={filters}
        onFiltersChange={(f) => { setFilters(f); setPage(1); }}
        displayLabels={DISPLAY_LABELS}
        quickFilters={[
          { label: 'Active', filters: [{ key: 'status', operator: 'is_not', value: 'completed' }] },
          { label: 'Completed', filters: [{ key: 'status', operator: 'is', value: 'completed' }] },
          { label: 'Flow only', filters: [{ key: 'template_type', operator: 'is', value: 'flow_test' }] },
          { label: 'Review only', filters: [{ key: 'template_type', operator: 'is', value: 'review_test' }] },
        ]}
        totalItems={activeFilters.length > 0 ? filtered.length : serverTotal}
      />

      {/* Board view */}
      {viewMode === 'board' ? (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ height: 'calc(100vh - 240px)' }}>
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              items={grouped[col.key] || []}
              isLoading={isLoading}
              onDrop={handleDrop}
              onOpen={setSelectedId}
            />
          ))}
        </div>
      ) : (
        <ListView tests={filtered} isLoading={isLoading} onOpen={setSelectedId} />
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={serverTotal} perPage={PER_PAGE} onPageChange={setPage} />

      {selectedId && (
        <TestCaseDialog id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
