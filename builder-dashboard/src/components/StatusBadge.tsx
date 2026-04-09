'use client';

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-text-muted/10 text-text-secondary',
  assigned: 'bg-accent-flow/10 text-accent-flow',
  in_progress: 'bg-accent-warning/10 text-accent-warning',
  completed: 'bg-accent-review/10 text-accent-review',
  cancelled: 'bg-accent-danger/10 text-accent-danger',
  expired: 'bg-text-muted/10 text-text-muted',
};

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || 'bg-text-muted/10 text-text-muted';
  const label = STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
