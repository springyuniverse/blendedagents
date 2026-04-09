'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, updateWebhook, pingWebhook, getWebhookHistory, listApiKeys, createApiKey, revokeApiKey, type ApiKey } from '@/lib/api';
import { AccountSettings } from '@/components/AccountSettings';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-0.5">Account settings and integrations</p>
      </div>

      <AccountSettingsWrapper />
      <ApiKeysSection queryClient={queryClient} />
      <WebhookSection queryClient={queryClient} />
      <WebhookHistorySection />
    </div>
  );
}

function AccountSettingsWrapper() {
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6 animate-pulse space-y-3">
        <div className="h-4 bg-surface-secondary rounded w-1/4" />
        <div className="h-10 bg-surface-secondary rounded" />
        <div className="h-10 bg-surface-secondary rounded" />
      </div>
    );
  }

  return (
    <AccountSettings
      name={me?.name || ''}
      email={me?.email || ''}
      accent="accent-flow"
      onNameSaved={() => queryClient.invalidateQueries({ queryKey: ['me'] })}
    />
  );
}

function ApiKeysSection({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [label, setLabel] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['api-keys'], queryFn: listApiKeys });
  const keys = data?.data || [];

  const createMutation = useMutation({
    mutationFn: () => createApiKey(label || undefined),
    onSuccess: (result) => {
      setNewKey(result.key);
      setLabel('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  return (
    <div className="bg-surface border border-border rounded-lg shadow-soft p-6">
      <h2 className="text-sm font-medium text-text-primary mb-4">API Keys</h2>

      {newKey && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-xs font-medium text-emerald-600 mb-1">
            Key created. Copy it now — it won't be shown again.
          </p>
          <code className="block text-xs bg-surface border border-emerald-200 rounded px-2 py-1.5 font-mono text-emerald-700 break-all select-all">
            {newKey}
          </code>
          <button onClick={() => setNewKey(null)}
            className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Key label (optional)"
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50"
        />
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="px-4 py-2 bg-accent-flow text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all duration-200"
        >
          {createMutation.isPending ? 'Creating...' : 'Generate Key'}
        </button>
      </div>

      {createMutation.isError && (
        <p className="text-sm text-accent-danger mb-3">
          {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create key'}
        </p>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-surface-secondary rounded" />)}
        </div>
      ) : keys.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-4">No API keys yet</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k: ApiKey) => (
            <div key={k.id} className="flex items-center justify-between py-2 px-3 border border-border rounded-lg">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-text-secondary">{k.key_prefix}...****</code>
                  {k.label && <span className="text-xs text-text-secondary">{k.label}</span>}
                  {k.revoked_at && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-50 text-accent-danger rounded font-medium">Revoked</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Created {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              {!k.revoked_at && (
                <button
                  onClick={() => revokeMutation.mutate(k.id)}
                  disabled={revokeMutation.isPending}
                  className="text-xs text-accent-danger hover:text-red-600 font-medium shrink-0 ml-3"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WebhookSection({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!url || secret.length < 16) return;
    setSaving(true);
    try {
      await updateWebhook({ url, secret });
      setMessage('Webhook configuration saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePing = async () => {
    setSaving(true);
    try {
      // Auto-save if URL and secret are filled
      if (url && secret.length >= 16) {
        await updateWebhook({ url, secret });
      }
      const result = await pingWebhook();
      setMessage('Test ping sent successfully');
      queryClient.invalidateQueries({ queryKey: ['webhook-history'] });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ping failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg shadow-soft p-6">
      <h2 className="text-sm font-medium text-text-primary mb-4">Webhook</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Webhook URL</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/webhooks/blendedagents"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Webhook Secret (min 16 characters, used to sign payloads)
          </label>
          <input type="text" value={secret} onChange={(e) => setSecret(e.target.value)}
            placeholder="e.g. my-webhook-secret-1234"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50" />
        </div>

        {message && (
          <p className={`text-sm ${message.includes('fail') || message.includes('Failed') ? 'text-accent-danger' : 'text-accent-review'}`}>
            {message}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !url || secret.length < 16}
            className="px-4 py-2 bg-accent-flow text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all duration-200">
            {saving ? 'Saving...' : 'Save Webhook'}
          </button>
          <button onClick={handlePing} disabled={saving || !url || secret.length < 16}
            className="px-4 py-2 border border-border text-text-secondary text-sm font-medium rounded-lg hover:bg-surface-secondary hover:border-border disabled:opacity-50 transition-all duration-200">
            {saving ? 'Sending...' : 'Send Test Ping'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WebhookHistorySection() {
  const { data, isLoading } = useQuery({
    queryKey: ['webhook-history'],
    queryFn: () => getWebhookHistory(),
  });

  const deliveries = data?.deliveries || [];

  return (
    <div className="bg-surface border border-border rounded-lg shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-text-primary">Webhook Delivery History</h2>
      </div>

      {isLoading ? (
        <div className="p-6 animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-4 bg-surface-secondary rounded" />)}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-text-secondary">No webhook deliveries yet</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-text-secondary px-5 py-2.5">Event</th>
              <th className="text-left text-xs font-medium text-text-secondary px-5 py-2.5">Status</th>
              <th className="text-right text-xs font-medium text-text-secondary px-5 py-2.5">Attempts</th>
              <th className="text-right text-xs font-medium text-text-secondary px-5 py-2.5">Delivered</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} className="border-b border-border-subtle hover:bg-surface-secondary transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-text-primary">{d.event_type}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    d.response_status && d.response_status < 400
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-accent-danger'
                  }`}>
                    {d.response_status ?? 'Pending'}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-text-secondary text-right">{d.attempt_count}</td>
                <td className="px-5 py-3 text-sm text-text-secondary text-right">
                  {d.delivered_at ? new Date(d.delivered_at).toLocaleString() : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
