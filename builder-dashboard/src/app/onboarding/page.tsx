'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { testerApi } from '@/lib/tester-api';
import { Logo } from '@/components/Logo';
import { ChevronRight, Clock, Loader2 } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────

const DEVICES = [
  'Desktop', 'Mobile (Android)', 'Mobile (iOS)', 'Tablet',
];

const EXPERIENCE_AREAS = [
  'Web Apps', 'Mobile Apps', 'API / Backend', 'E-commerce',
  'Forms & Workflows', 'Games',
];

const LANGUAGES = [
  'English', 'Arabic', 'Spanish', 'French', 'Portuguese', 'Hindi',
  'Urdu', 'Bengali', 'Mandarin', 'Japanese', 'Korean', 'German',
  'Turkish', 'Indonesian', 'Thai', 'Vietnamese', 'Swahili',
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'America/Mexico_City',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Istanbul',
  'Africa/Cairo', 'Africa/Lagos', 'Africa/Nairobi',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka',
  'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Pacific/Auckland',
];

// ── Shared components ────────────────────────────────────────────

function TagSelector({ options, selected, onChange }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (item: string) => {
    onChange(
      selected.includes(item)
        ? selected.filter((s) => s !== item)
        : [...selected, item],
    );
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((item) => {
        const on = selected.includes(item);
        return (
          <button key={item} type="button" onClick={() => toggle(item)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
              on
                ? 'bg-accent-review/10 text-accent-review border-accent-review/30'
                : 'bg-surface-secondary text-text-secondary border-border hover:border-accent-review/30 hover:text-text-primary'
            }`}>
            {item}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [assessmentDone, setAssessmentDone] = useState(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      testerApi.getProfile().then((profile) => {
        if (profile.onboarded) { router.replace('/tester/tasks'); return; }
        // If profile already filled, check for existing assessment task
        if (profile.devices && profile.devices.length > 0) {
          testerApi.getAssessment().then(({ assessment }) => {
            if (assessment) {
              // If assessment is already submitted/completed, stay here and show waiting state
              if (assessment.status === 'submitted' || assessment.status === 'completed') {
                setLoading(false);
                setAssessmentDone(true);
              } else {
                router.replace(`/tester/tasks/${assessment.task_id}`);
              }
            } else {
              setLoading(false);
            }
          }).catch(() => setLoading(false));
          return;
        }
        setLoading(false);
      }).catch(() => {
        router.replace('/login');
      });
    });
  }, [router]);

  const canSubmit = devices.length > 0 && skills.length > 0 && languages.length > 0 && timezone.length > 0;

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const { assessment_task_id } = await testerApi.saveOnboardingProfile({ devices, skills, languages, timezone });
      router.push(`/tester/tasks/${assessment_task_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
      </div>
    );
  }

  if (assessmentDone) {
    return (
      <div className="min-h-screen bg-bg flex justify-center px-4 py-8">
        <div className="w-full max-w-md mt-24">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <div className="text-accent-review"><Logo size={32} animate /></div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary">BlendedAgents</h1>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-6 shadow-soft text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Assessment submitted</h2>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">
              Your assessment has been submitted and is being reviewed by our team.
              You&apos;ll be able to access the platform once your account is approved.
            </p>
            <button onClick={() => { document.cookie = 'dev-session=;path=/;max-age=0'; try { createClient().auth.signOut(); } catch {} window.location.href = '/login'; }}
              className="mt-6 px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="text-accent-review">
              <Logo size={32} animate />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">BlendedAgents</h1>
          </div>
          <h2 className="text-base font-semibold text-text-primary mt-4">Tell us about yourself</h2>
          <p className="text-sm text-text-secondary mt-1">Quick profile — no resumes, no bios. Just the essentials.</p>
        </div>

        {/* Profile form */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-soft space-y-6">
          {error && (
            <div className="text-[13px] text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Primary Devices</h3>
            <p className="text-xs text-text-secondary mb-3">What do you test on? This determines task eligibility.</p>
            <TagSelector options={DEVICES} selected={devices} onChange={setDevices} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Experience Areas</h3>
            <p className="text-xs text-text-secondary mb-3">What types of products are you comfortable testing?</p>
            <TagSelector options={EXPERIENCE_AREAS} selected={skills} onChange={setSkills} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Report Languages</h3>
            <p className="text-xs text-text-secondary mb-3">What languages can you write clear bug reports in?</p>
            <TagSelector options={LANGUAGES} selected={languages} onChange={setLanguages} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Timezone</h3>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-review/50 focus:border-accent-review/50 transition-all appearance-none">
                <option value="" disabled>Select your timezone</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit || saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent-review text-white text-sm font-semibold rounded-lg hover:bg-accent-review/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            {saving ? 'Setting up...' : 'Continue to Assessment'}
          </button>

          <p className="text-xs text-text-muted text-center">
            Next: a short sandbox test to verify your testing skills.
          </p>
        </div>
      </div>
    </div>
  );
}
