'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, type Task } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    assigned: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const labels: Record<string, string> = {
    assigned: 'Assigned',
    in_progress: 'In Progress',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
        styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">{task.title}</h3>
          {task.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
          )}
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>{task.step_count} steps</span>
        {task.environment && <span>{task.environment}</span>}
        {task.assigned_at && (
          <span>Assigned {new Date(task.assigned_at).toLocaleDateString()}</span>
        )}
      </div>
    </Link>
  );
}

export default function TasksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        <p className="text-sm text-gray-500 mt-1">Your assigned test cases</p>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500 py-8 text-center">Loading tasks...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Failed to load tasks: {error.message}
        </div>
      )}

      {data && data.tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No tasks assigned</p>
          <p className="text-xs text-gray-400 mt-1">
            New tasks will appear here when they are assigned to you.
          </p>
        </div>
      )}

      {data && data.tasks.length > 0 && (
        <div className="space-y-3">
          {data.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
