'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { testerApi } from '@/lib/tester-api';
import { AccountSettings } from '@/components/AccountSettings';

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['tester-profile'],
    queryFn: () => testerApi.getProfile(),
  });

  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setTimezone(profile.timezone || '');
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (data: { display_name?: string; timezone?: string }) => testerApi.updateProfile(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tester-profile'] }); setIsDirty(false); },
  });

  const handleSave = () => {
    const updates: Record<string, string> = {};
    if (displayName !== profile?.display_name) updates.display_name = displayName;
    if (timezone !== (profile?.timezone || '')) updates.timezone = timezone;
    if (Object.keys(updates).length > 0) mutation.mutate(updates);
  };

  const handleFieldChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setIsDirty(true);
  };

  if (isLoading) return <div className="text-sm text-text-secondary py-8 text-center">Loading profile...</div>;

  if (error) {
    return (
      <div className="bg-accent-danger/10 border border-accent-danger/20 rounded-lg p-4 text-sm text-accent-danger">
        Failed to load profile: {error.message}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Profile</h2>
        <p className="text-sm text-text-secondary mt-1">Manage your account and tester settings</p>
      </div>

      {/* Account settings — email, password, display name */}
      <AccountSettings
        name={profile.display_name}
        email={profile.email}
        accent="accent-review"
        onNameSaved={(name) => {
          setDisplayName(name);
          queryClient.invalidateQueries({ queryKey: ['tester-profile'] });
        }}
      />

      {/* Tester-specific settings */}
      <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Tester Settings</h2>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Timezone</label>
          <input type="text" value={timezone} onChange={(e) => handleFieldChange(setTimezone, e.target.value)}
            placeholder="e.g., America/New_York"
            className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-review/50 focus:border-accent-review/50" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Region</label>
          <input type="text" value={profile.region} disabled
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-muted cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Skills</label>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-review/10 text-accent-review border border-accent-review/20">{skill}</span>
            ))}
            {profile.skills.length === 0 && <span className="text-xs text-text-muted">No skills listed</span>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Languages</label>
          <div className="flex flex-wrap gap-1.5">
            {profile.languages.map((lang) => (
              <span key={lang} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-secondary text-text-primary border border-border">{lang}</span>
            ))}
            {profile.languages.length === 0 && <span className="text-xs text-text-muted">No languages listed</span>}
          </div>
        </div>

        {isDirty && (
          <div className="flex items-center gap-2 pt-2">
            <button onClick={handleSave} disabled={mutation.isPending}
              className="bg-accent-review hover:bg-accent-review/90 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => { setDisplayName(profile.display_name); setTimezone(profile.timezone || ''); setIsDirty(false); }}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
          </div>
        )}

        {mutation.isError && <p className="text-xs text-accent-danger">Failed to save: {mutation.error?.message}</p>}
        {mutation.isSuccess && !isDirty && <p className="text-xs text-accent-review">Settings updated</p>}
      </div>

      {/* Statistics */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-semibold text-text-primary">{profile.tasks_completed}</p>
            <p className="text-xs text-text-secondary">Tasks Completed</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-text-primary">{profile.tasks_total}</p>
            <p className="text-xs text-text-secondary">Total Tasks</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-text-primary">{Number(profile.avg_completion_minutes || 0).toFixed(0)}m</p>
            <p className="text-xs text-text-secondary">Avg Completion</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-text-primary">${(profile.earnings_cents / 100).toFixed(2)}</p>
            <p className="text-xs text-text-secondary">Total Earnings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
