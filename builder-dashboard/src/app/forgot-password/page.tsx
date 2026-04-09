'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });

      if (resetError) {
        throw new Error(resetError.message);
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg" style={{ marginLeft: 0 }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            BlendedAgents
          </h1>
          <p className="text-sm text-text-muted mt-1">Reset your password</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 shadow-soft">
          {submitted ? (
            <div className="space-y-4">
              <div className="text-[13px] text-accent-review bg-accent-review/10 border border-accent-review/20 rounded-lg px-3 py-2">
                Check your email for reset instructions. If an account exists with that email, you will receive a password reset link.
              </div>
              <Link href="/login"
                className="block w-full text-center py-2.5 px-4 bg-accent-flow text-white text-sm font-semibold rounded-lg hover:bg-accent-flow/90  transition-all duration-200">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-text-primary mb-1">Email address</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-flow/50 focus:border-accent-flow/50 transition-all"
                  placeholder="you@company.com" required />
              </div>

              {error && (
                <div className="text-[13px] text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !email}
                className="w-full py-2.5 px-4 bg-accent-flow text-white text-sm font-semibold rounded-lg hover:bg-accent-flow/90  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <Link href="/login" className="text-xs text-text-muted hover:text-text-secondary">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
