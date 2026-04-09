'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testerApi } from '@/lib/tester-api';
import { Copy, Check, Plus, Gift } from 'lucide-react';

export default function InvitesPage() {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tester-invites'],
    queryFn: () => testerApi.getInvites(),
  });

  const generate = useMutation({
    mutationFn: () => testerApi.generateInvite(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tester-invites'] }),
  });

  const copyLink = (code: string, id: string) => {
    const link = `${window.location.origin}/signup/tester?invite=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id + '-code');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) return <div className="text-sm text-text-secondary py-8 text-center">Loading invites...</div>;

  if (error) {
    return (
      <div className="bg-accent-danger/10 border border-accent-danger/20 rounded-lg p-4 text-sm text-accent-danger">
        Failed to load invites: {error.message}
      </div>
    );
  }

  if (!data) return null;

  const hasSlots = data.max_invites > 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary">Invites</h2>
        <p className="text-sm text-text-secondary mt-1">Share invite codes with fellow testers to join the platform</p>
      </div>

      {!hasSlots ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-surface-secondary rounded-full mb-4">
            <Gift className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-sm text-text-secondary">No invite slots available</p>
          <p className="text-xs text-text-muted mt-1">Contact an admin to get invite access.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-surface border border-border rounded-lg shadow-soft p-4">
              <p className="text-xs text-text-secondary uppercase tracking-wide">Total Slots</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{data.max_invites}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg shadow-soft p-4">
              <p className="text-xs text-text-secondary uppercase tracking-wide">Used</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{data.used_count}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg shadow-soft p-4">
              <p className="text-xs text-text-secondary uppercase tracking-wide">Remaining</p>
              <p className="text-2xl font-semibold text-accent-review mt-1">{data.remaining}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-primary">
              Your Invite Codes
            </p>
            <button
              onClick={() => generate.mutate()}
              disabled={data.remaining <= 0 || generate.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-review text-white rounded-lg hover:bg-accent-review/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {generate.isPending ? 'Generating...' : 'Generate Invite'}
            </button>
          </div>

          {generate.isError && (
            <div className="text-[13px] text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-lg px-3 py-2 mb-4">
              {generate.error.message}
            </div>
          )}

          {data.invites.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-border rounded-lg shadow-soft">
              <p className="text-sm text-text-secondary">No invite codes generated yet</p>
              <p className="text-xs text-text-muted mt-1">Click &quot;Generate Invite&quot; to create your first code.</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg shadow-soft overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Code</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Created</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-surface-secondary">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-text-primary tracking-wide">{invite.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        {invite.used ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-secondary text-text-secondary border border-border">
                            Used{invite.used_at ? ` ${new Date(invite.used_at).toLocaleDateString()}` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-review/10 text-accent-review border border-accent-review/20">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!invite.used && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => copyCode(invite.code, invite.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                              title="Copy code"
                            >
                              {copiedId === invite.id + '-code' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              Code
                            </button>
                            <button
                              onClick={() => copyLink(invite.code, invite.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-accent-review hover:bg-accent-review/10 rounded transition-colors"
                              title="Copy invite link"
                            >
                              {copiedId === invite.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              Link
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
