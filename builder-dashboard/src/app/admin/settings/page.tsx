'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPlatformSettings, updatePlatformSettings, type AdminNotifications } from '@/lib/admin-api';
import { Check, X, Plus } from 'lucide-react';

function ToggleSwitch({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${checked ? 'bg-accent-admin' : 'bg-surface-secondary border border-border'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

const NOTIFICATION_LABELS: Record<keyof AdminNotifications, { label: string; description: string }> = {
  new_builder: { label: 'New builder registration', description: 'When a builder signs up for the platform' },
  new_tester: { label: 'New tester registration', description: 'When a tester signs up for the platform' },
  test_case_submitted: { label: 'Test case submitted', description: 'When a builder submits a new test case via API' },
  test_case_completed: { label: 'Test case completed', description: 'When a tester finishes testing and submits results' },
  tweet_reward_submitted: { label: 'Tweet reward submitted', description: 'When a builder submits a tweet for review' },
  payout_processed: { label: 'Payout processed', description: 'When a tester payout is processed' },
};

export default function AdminSettingsPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: getPlatformSettings,
  });

  const [requireInvite, setRequireInvite] = useState(true);
  const [defaultInvites, setDefaultInvites] = useState(0);
  const [notifyEmails, setNotifyEmails] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AdminNotifications>({
    new_builder: true, new_tester: true, test_case_submitted: true,
    test_case_completed: true, tweet_reward_submitted: true, payout_processed: true,
  });
  const [newEmail, setNewEmail] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setRequireInvite(settings.require_invite_code);
      setDefaultInvites(settings.default_max_invites);
      setNotifyEmails(settings.admin_notify_emails || []);
      setNotifications(settings.admin_notifications || {
        new_builder: true, new_tester: true, test_case_submitted: true,
        test_case_completed: true, tweet_reward_submitted: true, payout_processed: true,
      });
      setDirty(false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () => updatePlatformSettings({
      require_invite_code: requireInvite,
      default_max_invites: defaultInvites,
      admin_notify_emails: notifyEmails,
      admin_notifications: notifications,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setDirty(false);
    },
  });

  const handleChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (email && email.includes('@') && !notifyEmails.includes(email)) {
      setNotifyEmails([...notifyEmails, email]);
      setNewEmail('');
      setDirty(true);
    }
  };

  const removeEmail = (email: string) => {
    setNotifyEmails(notifyEmails.filter(e => e !== email));
    setDirty(true);
  };

  const toggleNotification = (key: keyof AdminNotifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputClass = 'w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-admin/50 transition-all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Settings</h1>
        <p className="text-sm text-text-muted mt-0.5">Platform-wide configuration</p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Invitation Settings */}
        <div className="bg-surface border border-border rounded-lg p-6 space-y-5">
          <h2 className="text-sm font-semibold text-text-primary">Tester Registration</h2>

          <ToggleSwitch
            checked={requireInvite}
            onChange={handleChange(setRequireInvite)}
            label="Require invite code to sign up"
            description="When enabled, new testers must enter a valid invite code during registration."
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Default invite slots for new testers</label>
            <input
              type="number" min={0} max={100} value={defaultInvites}
              onChange={e => handleChange(setDefaultInvites)(parseInt(e.target.value) || 0)}
              className={`${inputClass} max-w-[120px]`}
            />
            <p className="text-xs text-text-muted mt-1">
              New testers will receive this many invite slots automatically.
            </p>
          </div>
        </div>

        {/* Admin Email Notifications */}
        <div className="bg-surface border border-border rounded-lg p-6 space-y-5">
          <h2 className="text-sm font-semibold text-text-primary">Admin Email Notifications</h2>
          <p className="text-xs text-text-muted -mt-3">Get notified by email when key platform events occur.</p>

          {/* Recipient emails */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Notification recipients</label>
            <div className="space-y-1.5 mb-2">
              {notifyEmails.map(email => (
                <div key={email} className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary rounded-lg">
                  <span className="text-sm text-text-primary flex-1">{email}</span>
                  <button onClick={() => removeEmail(email)} className="text-text-muted hover:text-accent-danger p-0.5 transition-colors">
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              {notifyEmails.length === 0 && (
                <p className="text-xs text-text-muted italic">No recipients — notifications are disabled until you add at least one email.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEmail()}
                placeholder="admin@example.com"
                className={`${inputClass} flex-1`}
              />
              <button onClick={addEmail} disabled={!newEmail.trim()}
                className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary hover:bg-accent-admin/8 disabled:opacity-40 transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> Add
              </button>
            </div>
          </div>

          {/* Notification toggles */}
          <div className="space-y-4 pt-2">
            {(Object.keys(NOTIFICATION_LABELS) as (keyof AdminNotifications)[]).map(key => (
              <ToggleSwitch
                key={key}
                checked={notifications[key]}
                onChange={() => toggleNotification(key)}
                label={NOTIFICATION_LABELS[key].label}
                description={NOTIFICATION_LABELS[key].description}
              />
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={!dirty || mutation.isPending}
            className="px-4 py-2 bg-accent-admin text-white text-sm font-medium rounded-lg hover:bg-accent-admin/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          {mutation.isSuccess && !dirty && (
            <p className="text-xs text-accent-review">Settings saved.</p>
          )}
          {mutation.isError && (
            <p className="text-xs text-accent-danger">{(mutation.error as Error).message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
