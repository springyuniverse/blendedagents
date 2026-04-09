'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Eye, EyeOff, Check } from 'lucide-react';

// ---------------------------------------------------------------------------
// Account Settings — shared between builder and tester
// ---------------------------------------------------------------------------

interface AccountSettingsProps {
  /** Current display name */
  name: string;
  /** Current email */
  email: string;
  /** Accent color class for buttons — 'accent-flow' (builder) or 'accent-review' (tester) */
  accent?: 'accent-flow' | 'accent-review';
  /** Called after name is saved */
  onNameSaved?: (name: string) => void;
}

function FeedbackMessage({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <p className={`text-xs mt-2 ${type === 'success' ? 'text-accent-review' : 'text-accent-danger'}`}>
      {message}
    </p>
  );
}

export function AccountSettings({ name, email, accent = 'accent-flow', onNameSaved }: AccountSettingsProps) {
  return (
    <div className="space-y-6">
      <ProfileSection name={name} email={email} accent={accent} onNameSaved={onNameSaved} />
      <EmailSection email={email} accent={accent} />
      <PasswordSection accent={accent} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile (name)
// ---------------------------------------------------------------------------

function ProfileSection({ name, email, accent, onNameSaved }: { name: string; email: string; accent: string; onNameSaved?: (name: string) => void }) {
  const [displayName, setDisplayName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const isDirty = displayName !== name;

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
      if (error) throw new Error(error.message);
      setFeedback({ msg: 'Name updated', type: 'success' });
      onNameSaved?.(displayName.trim());
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ msg: err instanceof Error ? err.message : 'Failed to update', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h2 className="text-sm font-semibold text-text-primary mb-4">Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={`w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-${accent}/50 focus:border-${accent}/50`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
          <input type="email" value={email} disabled
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-muted cursor-not-allowed" />
          <p className="text-xs text-text-muted mt-1">Use the section below to change your email</p>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving || !displayName.trim()}
              className={`px-4 py-2 bg-${accent} text-white text-sm font-medium rounded-lg hover:bg-${accent}/90 disabled:opacity-50 transition-colors`}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setDisplayName(name)}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
          </div>
        )}
        {feedback && <FeedbackMessage message={feedback.msg} type={feedback.type} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email change
// ---------------------------------------------------------------------------

function EmailSection({ email, accent }: { email: string; accent: string }) {
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const handleChange = async () => {
    if (!newEmail.trim() || newEmail === email) return;
    setSaving(true);
    setFeedback(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw new Error(error.message);
      setFeedback({ msg: 'Confirmation email sent to your new address. Check both inboxes.', type: 'success' });
      setNewEmail('');
    } catch (err) {
      setFeedback({ msg: err instanceof Error ? err.message : 'Failed to update email', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h2 className="text-sm font-semibold text-text-primary mb-1">Change Email</h2>
      <p className="text-xs text-text-muted mb-4">A confirmation will be sent to both your current and new email</p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">New Email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={email}
            className={`w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-${accent}/50 focus:border-${accent}/50`}
          />
        </div>
        <button onClick={handleChange} disabled={saving || !newEmail.trim() || newEmail === email}
          className={`px-4 py-2 bg-${accent} text-white text-sm font-medium rounded-lg hover:bg-${accent}/90 disabled:opacity-50 transition-colors`}>
          {saving ? 'Sending...' : 'Update Email'}
        </button>
        {feedback && <FeedbackMessage message={feedback.msg} type={feedback.type} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password change
// ---------------------------------------------------------------------------

function PasswordSection({ accent }: { accent: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const valid = newPassword.length >= 6 && newPassword === confirmPassword;

  const handleChange = async () => {
    if (!valid) return;
    setSaving(true);
    setFeedback(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      setFeedback({ msg: 'Password updated successfully', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ msg: err instanceof Error ? err.message : 'Failed to update password', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h2 className="text-sm font-semibold text-text-primary mb-1">Change Password</h2>
      <p className="text-xs text-text-muted mb-4">Minimum 6 characters</p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">New Password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className={`w-full px-3 py-2 pr-10 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-${accent}/50 focus:border-${accent}/50`}
            />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`w-full px-3 py-2 pr-10 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-${accent}/50 focus:border-${accent}/50`}
            />
            {confirmPassword && newPassword === confirmPassword && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-review" />
            )}
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-accent-danger mt-1">Passwords don't match</p>
          )}
        </div>
        <button onClick={handleChange} disabled={saving || !valid}
          className={`px-4 py-2 bg-${accent} text-white text-sm font-medium rounded-lg hover:bg-${accent}/90 disabled:opacity-50 transition-colors`}>
          {saving ? 'Updating...' : 'Update Password'}
        </button>
        {feedback && <FeedbackMessage message={feedback.msg} type={feedback.type} />}
      </div>
    </div>
  );
}
