'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/api';
import { CreditBalance } from '@/components/CreditBalance';
import { createClient } from '@/lib/supabase';
import { Home, ClipboardList, FileText, Coins, Settings, LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';

const NAV_ITEMS = [
  { href: '/builder', label: 'Dashboard', icon: Home, exact: true },
  { href: '/builder/test-cases', label: 'Test Cases', icon: ClipboardList },
  { href: '/builder/templates', label: 'Templates', icon: FileText },
  { href: '/builder/credits', label: 'Credits', icon: Coins },
  { href: '/builder/settings', label: 'Settings', icon: Settings },
];

function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const handleLogout = () => {
    document.cookie = 'dev-session=;path=/;max-age=0';
    try { createClient().auth.signOut(); } catch { /* dev mode */ }
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-surface flex flex-col border-r border-border">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
        <div className="text-accent-flow">
          <Logo size={28} animate />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-text-primary leading-tight">
            BlendedAgents
          </h1>
          <p className="text-[11px] text-text-muted">Builder</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-[7px] rounded-md text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-accent-flow/8 text-accent-flow font-medium'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-accent-flow' : 'text-text-muted'}`} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Credits */}
      <div className="px-4 py-3 border-t border-border">
        <CreditBalance compact />
      </div>

      {/* User */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-text-primary truncate">{me?.name || 'Builder'}</p>
            <p className="text-xs text-text-muted truncate">{me?.email || ''}</p>
          </div>
          <button onClick={handleLogout} className="text-text-muted hover:text-text-primary p-1 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) { router.replace('/login'); return; }
      supabase.from('builders').select('id').eq('auth_user_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          if (data) { setAllowed(true); }
          else { router.replace('/tester/tasks'); }
        });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-5 h-5 border-2 border-accent-flow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="ml-56 min-h-screen bg-bg">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </>
  );
}
