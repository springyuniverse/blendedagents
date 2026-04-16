'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTweetRewards, reviewTweetReward, type AdminTweetReward } from '@/lib/admin-api';
import { Check, X, ExternalLink, Megaphone, Clock, CheckCircle2, XCircle } from 'lucide-react';

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
    pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-200', Icon: Clock },
    approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', Icon: CheckCircle2 },
    rejected: { label: 'Rejected', className: 'bg-red-500/10 text-red-600 border-red-200', Icon: XCircle },
    revoked: { label: 'Revoked', className: 'bg-text-muted/10 text-text-muted border-border', Icon: XCircle },
  };
  const c = config[status] || config.pending;
  const Icon = c.Icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.className}`}>
      <Icon className="w-3 h-3" strokeWidth={2} />
      {c.label}
    </span>
  );
}

function RejectModal({ reward, onClose }: { reward: AdminTweetReward; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => reviewTweetReward(reward.id, 'reject', reason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tweet-rewards'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-lifted w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">Reject Tweet Submission</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="mb-4 px-3 py-2 bg-surface-secondary rounded-lg">
          <p className="text-xs text-text-muted">Builder</p>
          <p className="text-sm text-text-primary font-medium">{reward.builder_name}</p>
          <p className="text-xs text-text-muted truncate mt-1">{reward.tweet_url}</p>
        </div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Reason (optional)</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Tweet does not mention BlendedAgents"
          rows={3}
          className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-admin/50"
        />
        {mutation.isError && <p className="text-xs text-accent-danger mt-2">{(mutation.error as Error).message}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2">
            <X className="w-3.5 h-3.5" strokeWidth={2} />
            {mutation.isPending ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTweetRewardsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejecting, setRejecting] = useState<AdminTweetReward | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tweet-rewards', statusFilter],
    queryFn: () => getTweetRewards({ status: statusFilter === 'all' ? undefined : statusFilter, limit: 50 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => reviewTweetReward(id, 'approve'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tweet-rewards'] }),
  });

  const rewards = data?.tweet_rewards || [];

  const pendingCount = rewards.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Tweet Rewards</h1>
        <p className="text-sm text-text-muted mt-0.5">Review and approve builder tweet submissions for free credits</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {[
          { key: 'pending', label: 'Pending', count: statusFilter === 'pending' ? data?.total : undefined },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'all', label: 'All' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === tab.key
                ? 'bg-accent-admin/10 text-accent-admin'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[10px] font-bold">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-10 h-10 text-text-muted mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm text-text-muted">
              {statusFilter === 'pending' ? 'No pending submissions to review' : `No ${statusFilter} submissions`}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Builder</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Tweet</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Credits</th>
                <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Submitted</th>
                <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map(r => (
                <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-text-primary">{r.builder_name}</p>
                    <p className="text-xs text-text-muted">{r.builder_email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <a
                      href={r.tweet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-accent-admin hover:underline max-w-[300px] truncate"
                      title={r.tweet_url}
                    >
                      <Megaphone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{r.tweet_url.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                    </a>
                    {r.rejection_reason && (
                      <p className="text-[11px] text-red-600 mt-1 italic">Reason: {r.rejection_reason}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5"><StatusPill status={r.status} /></td>
                  <td className="px-5 py-3.5 text-right text-sm font-mono text-text-primary">{r.credits_awarded}</td>
                  <td className="px-5 py-3.5 text-right text-[13px] text-text-muted font-mono">
                    {new Date(r.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {r.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => approveMutation.mutate(r.id)}
                          disabled={approveMutation.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md disabled:opacity-50 transition-colors"
                          title="Approve and award credits"
                        >
                          <Check className="w-3 h-3" strokeWidth={2} />
                          Approve
                        </button>
                        <button
                          onClick={() => setRejecting(r)}
                          disabled={approveMutation.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-border hover:bg-surface-secondary text-text-primary text-xs font-medium rounded-md transition-colors"
                          title="Reject"
                        >
                          <X className="w-3 h-3" strokeWidth={2} />
                          Reject
                        </button>
                      </div>
                    ) : r.reviewed_at ? (
                      <span className="text-[11px] text-text-muted font-mono">
                        {new Date(r.reviewed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rejecting && <RejectModal reward={rejecting} onClose={() => setRejecting(null)} />}
    </div>
  );
}
