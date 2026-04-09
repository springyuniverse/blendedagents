'use client';

import { useState } from 'react';
import { SlidersHorizontal, X, Plus, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Operator = 'is' | 'is_not' | 'contains' | 'gt' | 'lt';

export interface Filter {
  id: string;
  key: string;
  operator: Operator;
  value: string;
}

export interface FilterKeyDef {
  key: string;
  label: string;
  type: 'enum' | 'text' | 'number';
  options?: string[];
}

export interface QuickFilter {
  label: string;
  filters: Omit<Filter, 'id'>[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OPERATORS: Record<string, { ops: { value: Operator; label: string }[] }> = {
  enum: { ops: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }] },
  text: { ops: [{ value: 'contains', label: 'contains' }, { value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }] },
  number: { ops: [{ value: 'is', label: '=' }, { value: 'gt', label: '>' }, { value: 'lt', label: '<' }] },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters<T>(items: T[], filters: Filter[]): T[] {
  const active = filters.filter((f) => f.value);
  if (active.length === 0) return items;
  return items.filter((item) =>
    active.every((f) => {
      const raw = (item as Record<string, unknown>)[f.key];
      const val = Array.isArray(raw) ? raw.join(',') : String(raw ?? '');
      switch (f.operator) {
        case 'is': return val === f.value;
        case 'is_not': return val !== f.value;
        case 'contains': return val.toLowerCase().includes(f.value.toLowerCase());
        case 'gt': return Number(val) > Number(f.value);
        case 'lt': return Number(val) < Number(f.value);
        default: return true;
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Filter Popover
// ---------------------------------------------------------------------------

function FilterPopover({
  filterKeys,
  displayLabels,
  onApply,
  onClose,
}: {
  filterKeys: FilterKeyDef[];
  displayLabels?: Record<string, Record<string, string>>;
  onApply: (f: Filter) => void;
  onClose: () => void;
}) {
  const [key, setKey] = useState<string>(filterKeys[0].key);
  const [operator, setOperator] = useState<Operator>('is');
  const [value, setValue] = useState('');

  const keyDef = filterKeys.find((k) => k.key === key) || filterKeys[0];
  const ops = OPERATORS[keyDef.type]?.ops || OPERATORS.text.ops;

  const handleKeyChange = (newKey: string) => {
    setKey(newKey);
    const def = filterKeys.find((k) => k.key === newKey) || filterKeys[0];
    setOperator((OPERATORS[def.type]?.ops || OPERATORS.text.ops)[0].value);
    setValue('');
  };

  const handleApply = () => {
    if (!value) return;
    onApply({ id: crypto.randomUUID(), key, operator, value });
    setKey(filterKeys[0].key);
    setOperator('is');
    setValue('');
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full left-0 mt-1 z-50 w-[340px] bg-surface border border-border rounded-lg shadow-lifted">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-text-primary">Add filter</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Field</label>
            <div className="relative">
              <select value={key} onChange={(e) => handleKeyChange(e.target.value)}
                className="w-full appearance-none bg-surface-secondary border border-border rounded-md pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-flow/50 cursor-pointer">
                {filterKeys.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Condition</label>
            <div className="relative">
              <select value={operator} onChange={(e) => setOperator(e.target.value as Operator)}
                className="w-full appearance-none bg-surface-secondary border border-border rounded-md pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-flow/50 cursor-pointer">
                {ops.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Value</label>
            {keyDef.type === 'enum' && keyDef.options ? (
              <div className="relative">
                <select value={value} onChange={(e) => setValue(e.target.value)}
                  className="w-full appearance-none bg-surface-secondary border border-border rounded-md pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-flow/50 cursor-pointer">
                  <option value="">Select...</option>
                  {keyDef.options.map((opt) => <option key={opt} value={opt}>{displayLabels?.[key]?.[opt] || opt}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              </div>
            ) : (
              <input type={keyDef.type === 'number' ? 'number' : 'text'} value={value}
                onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                placeholder={keyDef.type === 'number' ? 'Enter number...' : 'Enter value...'}
                className="w-full bg-surface-secondary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50"
                autoFocus />
            )}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
          <button onClick={handleApply} disabled={!value}
            className="px-3 py-1.5 bg-accent-flow text-white text-sm font-medium rounded-md hover:bg-accent-flow/90 disabled:opacity-40 transition-colors">
            Apply
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// DataToolbar — unified search + filters + quick filters + pagination
// ---------------------------------------------------------------------------

export interface DataToolbarProps {
  /** Search */
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;

  /** Filters */
  filterKeys: FilterKeyDef[];
  filters: Filter[];
  onFiltersChange: (filters: Filter[]) => void;
  displayLabels?: Record<string, Record<string, string>>;

  /** Quick filter presets shown as buttons */
  quickFilters?: QuickFilter[];

  /** Pagination (omit to hide) */
  page?: number;
  totalPages?: number;
  totalItems?: number;
  perPage?: number;
  onPageChange?: (page: number) => void;
}

export function DataToolbar({
  search, onSearchChange, searchPlaceholder = 'Search...',
  filterKeys, filters, onFiltersChange, displayLabels,
  quickFilters,
  page, totalPages, totalItems, perPage, onPageChange,
}: DataToolbarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const activeFilters = filters.filter((f) => f.value);

  const addFilter = (f: Filter) => {
    onFiltersChange([...filters, f]);
    setPopoverOpen(false);
  };

  const applyQuick = (qf: QuickFilter) => {
    const newFilters = qf.filters.map((f) => ({ ...f, id: crypto.randomUUID() }));
    onFiltersChange(newFilters);
  };

  const isQuickActive = (qf: QuickFilter) => {
    if (activeFilters.length !== qf.filters.length) return false;
    return qf.filters.every((qff) =>
      activeFilters.some((af) => af.key === qff.key && af.operator === qff.operator && af.value === qff.value),
    );
  };

  return (
    <div className="space-y-2">
      {/* Row 1: Search + Filter button + Quick filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setPopoverOpen(!popoverOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
              activeFilters.length > 0
                ? 'border-accent-flow/30 bg-accent-flow/5 text-accent-flow'
                : 'border-border text-text-secondary hover:bg-surface-secondary'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilters.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-accent-flow text-white text-xs rounded-full leading-none">
                {activeFilters.length}
              </span>
            )}
          </button>
          {popoverOpen && (
            <FilterPopover filterKeys={filterKeys} displayLabels={displayLabels} onApply={addFilter} onClose={() => setPopoverOpen(false)} />
          )}
        </div>

        {/* Quick filters */}
        {quickFilters && quickFilters.map((qf) => (
          <button
            key={qf.label}
            onClick={() => isQuickActive(qf) ? onFiltersChange([]) : applyQuick(qf)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              isQuickActive(qf)
                ? 'border-accent-flow/30 bg-accent-flow/8 text-accent-flow'
                : 'border-border text-text-secondary hover:bg-surface-secondary'
            }`}
          >
            {qf.label}
          </button>
        ))}
      </div>

      {/* Row 2: Active filter tags */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters.map((f) => {
            const keyLabel = filterKeys.find((k) => k.key === f.key)?.label || f.key;
            const opLabel = Object.values(OPERATORS).flatMap((o) => o.ops).find((o) => o.value === f.operator)?.label || f.operator;
            const valLabel = displayLabels?.[f.key]?.[f.value] || f.value;
            return (
              <span key={f.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-surface border border-border rounded-md text-xs">
                <span className="text-text-muted">{keyLabel}</span>
                <span className="text-text-muted">{opLabel}</span>
                <span className="font-medium text-text-primary">{valLabel}</span>
                <button onClick={() => onFiltersChange(filters.filter((x) => x.id !== f.id))}
                  className="p-0.5 ml-0.5 text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 rounded transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <button onClick={() => onFiltersChange([])} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
            Clear all
          </button>
          {totalItems !== undefined && (
            <span className="text-xs text-text-muted ml-auto">{totalItems} results</span>
          )}
        </div>
      )}

      {/* Row 3: Pagination */}
      {page !== undefined && totalPages !== undefined && totalPages > 1 && onPageChange && (
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} perPage={perPage} onPageChange={onPageChange} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standalone Pagination
// ---------------------------------------------------------------------------

export function Pagination({ page, totalPages, totalItems, perPage, onPageChange }: {
  page: number;
  totalPages: number;
  totalItems?: number;
  perPage?: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between py-3 border-t border-border">
      <p className="text-sm text-text-muted">
        {perPage && totalItems ? `${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalItems)} of ${totalItems}` : `Page ${page}`}
      </p>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-surface-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="text-sm text-text-primary tabular-nums min-w-[80px] text-center">
          Page {page} of {totalPages}
        </span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-surface-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
