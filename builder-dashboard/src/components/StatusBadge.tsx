'use client';

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-700',
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  expired: 'bg-orange-50 text-orange-700',
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
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
