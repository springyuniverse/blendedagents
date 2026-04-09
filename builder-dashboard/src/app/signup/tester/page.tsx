'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Check, X, Loader2, Lock, ArrowRight } from 'lucide-react';

const REGIONS = [
  { value: 'egypt', label: 'Egypt' },
  { value: 'mena', label: 'MENA' },
  { value: 'southeast_asia', label: 'Southeast Asia' },
  { value: 'south_asia', label: 'South Asia' },
  { value: 'sub_saharan_africa', label: 'Sub-Saharan Africa' },
  { value: 'latin_america', label: 'Latin America' },
  { value: 'global', label: 'Other' },
];

export default function TesterSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteRequired, setInviteRequired] = useState<boolean | null>(null);
  const [step, setStep] = useState<'loading' | 'invite' | 'signup'>('loading');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteChecking, setInviteChecking] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if invite is required + prefill from URL
  useEffect(() => {
    const code = searchParams.get('invite');
    if (code) setInviteCode(code.toUpperCase().trim());

    fetch('/auth/signup-config')
      .then(r => r.json())
      .then(data => {
        const required = data.require_invite_code !== false;
        setInviteRequired(required);
        // Skip invite step if not required and no code in URL
        if (!required && !code) {
          setStep('signup');
        } else {
          setStep('invite');
        }
      })
      .catch(() => {
        setInviteRequired(true);
        setStep('invite');
      });
  }, [searchParams]);

  const validateInvite = useCallback(async (code: string) => {
    const trimmed = code.toUpperCase().trim();
    if (!trimmed) {
      setInviteValid(null);
      return;
    }
    setInviteChecking(true);
    try {
      const res = await fetch(`/auth/validate-invite?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setInviteValid(data.valid === true);
    } catch {
      setInviteValid(false);
    } finally {
      setInviteChecking(false);
    }
  }, []);

  // Auto-validate when prefilled from URL
  useEffect(() => {
    if (inviteCode && inviteValid === null) {
      validateInvite(inviteCode);
    }
  }, [inviteCode, inviteValid, validateInvite]);

  // Auto-advance to signup when URL-prefilled code validates
  useEffect(() => {
    if (inviteValid === true && step === 'invite') {
      setStep('signup');
    }
  }, [inviteValid, step]);

  const handleContinue = () => {
    if (inviteValid === true) {
      setStep('signup');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'tester',
            display_name: displayName,
            region,
            ...(inviteCode.trim() && { invite_code: inviteCode.toUpperCase().trim() }),
          },
        },
      });

      if (authError) throw new Error(authError.message);
      router.push('/login?message=Check your email to confirm your account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-review/50 focus:border-accent-review/50 transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            BlendedAgents
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {step === 'loading' ? '' : step === 'invite' ? 'Tester Registration' : 'Create a Tester account'}
          </p>
        </div>

        {step === 'loading' ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-accent-review border-t-transparent rounded-full animate-spin" />
          </div>
        ) : step === 'invite' ? (
          <div className="bg-surface border border-border rounded-lg p-6 shadow-soft space-y-5">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-accent-review/10 rounded-full">
                <Lock className="w-5 h-5 text-accent-review" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Invitation Only</h2>
                <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
                  BlendedAgents is currently invite-only. You need a valid invitation code from an existing tester to create an account.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="inviteCode" className="block text-xs font-semibold text-text-primary mb-1">Invite Code</label>
              <div className="relative">
                <input id="inviteCode" type="text" value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteValid(null); }}
                  onBlur={() => validateInvite(inviteCode)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (inviteValid !== true) validateInvite(inviteCode); else handleContinue(); } }}
                  className={`${inputClass} pr-9 font-mono tracking-wide`}
                  placeholder="BA-XXXXXXXX" autoFocus />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {inviteChecking && <Loader2 className="w-4 h-4 text-text-muted animate-spin" />}
                  {!inviteChecking && inviteValid === true && <Check className="w-4 h-4 text-emerald-500" />}
                  {!inviteChecking && inviteValid === false && <X className="w-4 h-4 text-accent-danger" />}
                </div>
              </div>
              {inviteValid === false && (
                <p className="text-xs text-accent-danger mt-1">Invalid or already used invite code</p>
              )}
            </div>

            <button
              onClick={handleContinue}
              disabled={inviteValid !== true}
              className="w-full py-2.5 px-4 bg-accent-review text-white text-sm font-semibold rounded-lg hover:bg-accent-review/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2 pt-1">
              <p className="text-xs text-text-secondary">
                Already have an account?{' '}
                <Link href="/login" className="text-accent-review hover:text-accent-review/80 font-medium">Sign in</Link>
              </p>
              <p className="text-xs text-text-muted">
                Want to build instead?{' '}
                <Link href="/signup/builder" className="text-accent-review hover:text-accent-review/80 font-medium">Sign up as Builder</Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-lg p-6 shadow-soft space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700">
                Invite code <span className="font-mono font-semibold">{inviteCode}</span> verified
              </p>
            </div>

            {error && (
              <div className="text-[13px] text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-xs font-semibold text-text-primary mb-1">Name</label>
                <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                  placeholder="Your name" required autoFocus />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-text-primary mb-1">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@email.com" required />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-text-primary mb-1">Password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Min 6 characters" minLength={6} required />
              </div>

              <div>
                <label htmlFor="region" className="block text-xs font-semibold text-text-primary mb-1">Region</label>
                <select id="region" value={region} onChange={(e) => setRegion(e.target.value)}
                  className={inputClass}
                  required>
                  <option value="" disabled>Select your region</option>
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <button type="submit" disabled={loading || !email || !password || !displayName || !region}
                className="w-full py-2.5 px-4 bg-accent-review text-white text-sm font-semibold rounded-lg hover:bg-accent-review/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? 'Creating account...' : 'Create Tester Account'}
              </button>
            </form>

            <div className="text-center space-y-2 pt-2">
              <p className="text-xs text-text-secondary">
                Already have an account?{' '}
                <Link href="/login" className="text-accent-review hover:text-accent-review/80 font-medium">Sign in</Link>
              </p>
              <p className="text-xs text-text-muted">
                Want to build instead?{' '}
                <Link href="/signup/builder" className="text-accent-review hover:text-accent-review/80 font-medium">Sign up as Builder</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
