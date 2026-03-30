'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, updateWebhook, pingWebhook, getWebhookHistory } from '@/lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Account settings and integrations</p>
      </div>

      <ProfileSection />
      <WebhookSection queryClient={queryClient} />
      <WebhookHistorySection />
    </div>
  );
}

function ProfileSection() {
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe });

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/4 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-sm font-medium text-gray-900 mb-4">Profile</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <p className="text-sm text-gray-900">{me?.name || '--'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <p className="text-sm text-gray-900">{me?.email || '--'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
          <p className="text-sm text-gray-900 capitalize">{me?.plan || '--'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Member since</label>
          <p className="text-sm text-gray-900">
            {me?.created_at ? new Date(me.created_at).toLocaleDateString() : '--'}
          </p>
        </div>
      </div>
    </div>
  );
}

function WebhookSection({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState('');

  const saveMutation = useMutation({
    mutationFn: () => updateWebhook({ url, ...(secret ? { secret } : {}) }),
    onSuccess: () => {
      setMessage('Webhook configuration saved');
      setTimeout(() => setMessage(''), 3000);
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
    },
  });

  const pingMutation = useMutation({
    mutationFn: pingWebhook,
    onSuccess: () => {
      setMessage('Test ping sent successfully');
      queryClient.invalidateQueries({ queryKey: ['webhook-history'] });
      setTimeout(() => setMessage(''), 3000);
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Ping failed');
    },
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-sm font-medium text-gray-900 mb-4">Webhook</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Webhook URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/webhooks/blendedagents"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Webhook Secret (optional, leave blank to keep current)
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="whsec_..."
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.includes('fail') || message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !url}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Webhook'}
          </button>
          <button
            onClick={() => pingMutation.mutate()}
            disabled={pingMutation.isPending}
            className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {pingMutation.isPending ? 'Pinging...' : 'Send Test Ping'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WebhookHistorySection() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['webhook-history', page],
    queryFn: () => getWebhookHistory(page),
  });

  const deliveries = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Webhook Delivery History</h2>
      </div>

      {isLoading ? (
        <div className="p-6 animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded" />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">
          No webhook deliveries yet
        </div>
      ) : (
        <>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-2.5">Event</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-2.5">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-2.5">Response</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-2.5">Duration</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-2.5">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm text-gray-900 font-mono text-xs">{d.event}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.success
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {d.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right font-mono">{d.status_code}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">{d.response_time_ms}ms</td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">
                    {new Date(d.delivered_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (pagination?.total_pages || 1)}
                  className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
