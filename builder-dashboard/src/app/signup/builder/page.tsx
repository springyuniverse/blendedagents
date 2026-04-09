'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function BuilderSignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
            role: 'builder',
            display_name: displayName,
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            BlendedAgents
          </h1>
          <p className="text-sm text-text-muted mt-1">Create a Builder account</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 shadow-soft space-y-4">
          {error && (
            <div className="text-[13px] text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-text-primary mb-1">Name</label>
              <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 transition-all"
                placeholder="Your name" required />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-text-primary mb-1">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 transition-all"
                placeholder="you@company.com" required />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-text-primary mb-1">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 transition-all"
                placeholder="Min 6 characters" minLength={6} required />
            </div>

            <button type="submit" disabled={loading || !email || !password || !displayName}
              className="w-full py-2.5 px-4 bg-accent-flow text-white text-sm font-semibold rounded-lg hover:bg-accent-flow/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? 'Creating account...' : 'Create Builder Account'}
            </button>
          </form>

          <div className="text-center space-y-2 pt-2">
            <p className="text-xs text-text-secondary">
              Already have an account?{' '}
              <Link href="/login" className="text-accent-flow hover:text-accent-flow/80 font-medium">Sign in</Link>
            </p>
            <p className="text-xs text-text-muted">
              Want to test instead?{' '}
              <Link href="/signup/tester" className="text-accent-flow hover:text-accent-flow/80 font-medium">Sign up as Tester</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
