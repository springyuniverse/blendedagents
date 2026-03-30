'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
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
    mutationFn: (data: { display_name?: string; timezone?: string }) =>
      api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsDirty(false);
    },
  });

  const handleSave = () => {
    const updates: Record<string, string> = {};
    if (displayName !== profile?.display_name) updates.display_name = displayName;
    if (timezone !== (profile?.timezone || '')) updates.timezone = timezone;

    if (Object.keys(updates).length > 0) {
      mutation.mutate(updates);
    }
  };

  const handleFieldChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setIsDirty(true);
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        Failed to load profile: {error.message}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your account settings</p>
      </div>

      {/* Profile form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => handleFieldChange(setDisplayName, e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => handleFieldChange(setTimezone, e.target.value)}
            placeholder="e.g., America/New_York"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
          <input
            type="text"
            value={profile.region}
            disabled
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Skills</label>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
              >
                {skill}
              </span>
            ))}
            {profile.skills.length === 0 && (
              <span className="text-xs text-gray-400">No skills listed</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Languages</label>
          <div className="flex flex-wrap gap-1.5">
            {profile.languages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
              >
                {lang}
              </span>
            ))}
            {profile.languages.length === 0 && (
              <span className="text-xs text-gray-400">No languages listed</span>
            )}
          </div>
        </div>

        {isDirty && (
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setDisplayName(profile.display_name);
                setTimezone(profile.timezone || '');
                setIsDirty(false);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}

        {mutation.isError && (
          <p className="text-xs text-red-600">
            Failed to save: {mutation.error?.message}
          </p>
        )}

        {mutation.isSuccess && !isDirty && (
          <p className="text-xs text-green-600">Profile updated successfully</p>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-semibold text-gray-900">{profile.tasks_completed}</p>
            <p className="text-xs text-gray-500">Tasks Completed</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900">{profile.tasks_total}</p>
            <p className="text-xs text-gray-500">Total Tasks</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900">
              {profile.avg_completion_minutes.toFixed(0)}m
            </p>
            <p className="text-xs text-gray-500">Avg Completion</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900">
              ${(profile.earnings_cents / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">Total Earnings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
