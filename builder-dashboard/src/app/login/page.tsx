'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Logo } from '@/components/Logo';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function DevLogin() {
  const handleDevLogin = (role: 'builder' | 'tester' | 'admin') => {
    const emails: Record<string, string> = { builder: 'builder@test.com', tester: 'tester@test.com', admin: 'admin@test.com' };
    const redirects: Record<string, string> = { builder: '/builder', tester: '/tester/tasks', admin: '/admin' };
    document.cookie = `dev-session=${role}:${emails[role]};path=/`;
    window.location.href = redirects[role];
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden">
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="text-accent-flow mb-3">
            <Logo size={44} animate />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            BlendedAgents
          </h1>
          <p className="text-sm text-text-muted mt-1">Development Mode</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 shadow-soft space-y-4">
          <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-lg px-3 py-2">
            <p className="text-[13px] text-accent-warning">
              Supabase is not configured. Using dev login.
            </p>
          </div>

          <button
            onClick={() => handleDevLogin('builder')}
            className="w-full py-2.5 px-4 bg-accent-flow text-white text-sm font-semibold rounded-lg hover:bg-accent-flow/90 transition-all duration-200"
          >
            Enter as Builder
            <span className="block text-xs text-white/60 font-normal mt-0.5">builder@test.com</span>
          </button>

          <button
            onClick={() => handleDevLogin('tester')}
            className="w-full py-2.5 px-4 bg-surface-secondary border border-border text-text-primary text-sm font-semibold rounded-lg hover:bg-surface-secondary/80 transition-all duration-200"
          >
            Enter as Tester
            <span className="block text-xs text-text-muted font-normal mt-0.5">tester@test.com</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-surface text-text-muted">or</span></div>
          </div>

          <button
            onClick={() => handleDevLogin('admin')}
            className="w-full py-2.5 px-4 bg-accent-admin text-white text-sm font-semibold rounded-lg hover:bg-accent-admin/90 transition-all duration-200"
          >
            Enter as Admin
            <span className="block text-xs text-white/60 font-normal mt-0.5">admin@test.com</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error(authError.message);
      router.push('/');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setFormError('Enter your email address first'); return; }
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    });
    if (resetError) {
      setFormError(resetError.message);
    } else {
      setFormError('');
      alert('Check your email for a password reset link.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden">
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="text-accent-flow mb-3">
            <Logo size={44} animate />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            BlendedAgents
          </h1>
          <p className="text-sm text-text-muted mt-1">Sign in to your account</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 shadow-soft space-y-4">
          {message && (
            <div className="text-[13px] text-accent-review bg-accent-review/10 border border-accent-review/20 rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          {(formError || error) && (
            <div className="text-[13px] text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-lg px-3 py-2">
              {formError || error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-text-primary mb-1">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 transition-all"
                required />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-text-primary mb-1">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 transition-all"
                required />
              <div className="text-right mt-1">
                <button type="button" onClick={handleForgotPassword} className="text-xs text-accent-flow hover:text-accent-flow/80 font-medium">
                  Forgot password?
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || !email || !password}
              className="w-full py-2.5 px-4 bg-accent-flow text-white text-sm font-semibold rounded-lg hover:bg-accent-flow/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-surface text-text-muted">no account?</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a href="/signup/builder"
              className="py-2.5 px-4 text-center border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-all duration-200">
              Sign up as Builder
            </a>
            <a href="/signup/tester"
              className="py-2.5 px-4 text-center border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-all duration-200">
              Sign up as Tester
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  if (!SUPABASE_CONFIGURED) {
    return <DevLogin />;
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
