'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPlatformSettings, updatePlatformSettings } from '@/lib/admin-api';
import { Check } from 'lucide-react';

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

export default function AdminSettingsPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: getPlatformSettings,
  });

  const [requireInvite, setRequireInvite] = useState(true);
  const [defaultInvites, setDefaultInvites] = useState(0);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setRequireInvite(settings.require_invite_code);
      setDefaultInvites(settings.default_max_invites);
      setDirty(false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () => updatePlatformSettings({
      require_invite_code: requireInvite,
      default_max_invites: defaultInvites,
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
            description="When enabled, new testers must enter a valid invite code during registration. When disabled, anyone can sign up."
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Default invite slots for new testers</label>
            <input
              type="number" min={0} max={100} value={defaultInvites}
              onChange={e => handleChange(setDefaultInvites)(parseInt(e.target.value) || 0)}
              className={`${inputClass} max-w-[120px]`}
            />
            <p className="text-xs text-text-muted mt-1">
              New testers will receive this many invite slots automatically. Set to 0 to require manual allocation per tester.
            </p>
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
