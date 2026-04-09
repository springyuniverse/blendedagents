'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AvailabilityToggle } from '@/components/tester/AvailabilityToggle';
import { createClient } from '@/lib/supabase';
import { testerApi } from '@/lib/tester-api';
import { ClipboardList, User, DollarSign, LogOut, Clock, Gift } from 'lucide-react';
import { Logo } from '@/components/Logo';

const links = [
  { href: '/tester/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/tester/invites', label: 'Invites', icon: Gift },
  { href: '/tester/profile', label: 'Profile', icon: User },
  { href: '/tester/earnings', label: 'Earnings', icon: DollarSign },
];

function Sidebar({ isActive }: { isActive: boolean }) {
  const pathname = usePathname();

  const handleLogout = () => {
    document.cookie = 'dev-session=;path=/;max-age=0';
    try { createClient().auth.signOut(); } catch { /* dev mode */ }
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-56 border-r border-border bg-surface flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
        <div className="text-accent-review">
          <Logo size={28} animate />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-text-primary leading-tight">
            BlendedAgents
          </h1>
          <p className="text-[11px] text-text-muted">Tester</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150 ${
                active
                  ? 'bg-accent-review/10 text-accent-review font-medium'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              }`}>
              <Icon className={`w-4 h-4 ${active ? 'text-accent-review' : 'text-text-muted'}`} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {isActive && (
        <div className="px-4 py-4 border-t border-border">
          <AvailabilityToggle />
        </div>
      )}

      {!isActive && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>In Review</span>
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-border">
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function InReviewBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 mb-6">
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-amber-900">Account in review</h3>
          <p className="text-sm text-amber-700 mt-0.5">
            Your assessment has been submitted. Our team is reviewing your profile and results.
            Once approved, you'll be able to browse and take tests.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TesterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<'loading' | 'ready' | 'not-onboarded'>('loading');
  const [isActive, setIsActive] = useState(false);

  // Fetch profile ONCE on mount — not on every navigation
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) { router.replace('/login'); return; }

      testerApi.getProfile().then((profile) => {
        if (cancelled) return;
        if (!profile.onboarded) {
          setAuthState('not-onboarded');
          return;
        }
        setIsActive(profile.is_active);
        setAuthState('ready');
      }).catch(() => {
        if (!cancelled) router.replace('/builder');
      });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route guard for non-onboarded testers — runs on pathname change using cached state
  useEffect(() => {
    if (authState !== 'not-onboarded') return;
    const isTaskPage = /^\/tester\/tasks\/[0-9a-f-]+$/i.test(pathname);
    if (!isTaskPage) {
      router.replace('/onboarding');
    }
  }, [authState, pathname, router]);

  if (authState === 'loading') {
    return <div className="min-h-screen bg-bg flex items-center justify-center"><p className="text-sm text-text-muted">Loading...</p></div>;
  }

  // During assessment: render without sidebar, just the task page
  if (authState === 'not-onboarded') {
    return (
      <main className="min-h-screen bg-bg">
        <div className="max-w-4xl mx-auto px-6 py-8">{children}</div>
      </main>
    );
  }

  return (
    <>
      <Sidebar isActive={isActive} />
      <main className="ml-56 min-h-screen bg-bg">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {!isActive && <InReviewBanner />}
          {children}
        </div>
      </main>
    </>
  );
}
