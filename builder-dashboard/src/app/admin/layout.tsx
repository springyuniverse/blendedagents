'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  DollarSign,
  Mail,
  GraduationCap,
  Megaphone,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/builders', label: 'Builders', icon: Users },
  { href: '/admin/testers', label: 'Testers', icon: UserCheck },
  { href: '/admin/test-cases', label: 'Test Cases', icon: ClipboardList },
  { href: '/admin/assessments', label: 'Assessments', icon: GraduationCap },
  { href: '/admin/tweet-rewards', label: 'Tweet Rewards', icon: Megaphone },
  { href: '/admin/financials', label: 'Financials', icon: DollarSign },
  { href: '/admin/email-templates', label: 'Emails', icon: Mail },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    document.cookie = 'dev-session=;path=/;max-age=0';
    try { createClient().auth.signOut(); } catch { /* dev mode */ }
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-surface flex flex-col border-r border-border z-30">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
        <div className="text-accent-admin">
          <Logo size={28} animate />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-text-primary leading-tight">
            BlendedAgents
          </h1>
          <p className="text-[11px] text-text-muted">Admin</p>
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
                  ? 'bg-accent-admin/8 text-accent-admin font-medium'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-accent-admin' : 'text-text-muted'}`} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Admin badge */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-admin/8 rounded-md">
          <Shield className="w-4 h-4 text-accent-admin" strokeWidth={1.5} />
          <span className="text-xs font-medium text-accent-admin">Admin Access</span>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-text-primary truncate">Admin</p>
            <p className="text-xs text-text-muted truncate">admin@test.com</p>
          </div>
          <button onClick={handleLogout} className="text-text-muted hover:text-text-primary p-1 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Dev mode: check cookie
    const devMatch = document.cookie.match(/dev-session=([^;]+)/);
    if (devMatch && devMatch[1].startsWith('admin')) {
      setAllowed(true);
      return;
    }

    // Production: check Supabase user
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      // Admin emails check done server-side; for now just allow through
      // The API will reject unauthorized requests
      setAllowed(true);
    });
  }, [router]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="ml-56 min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
      </main>
    </>
  );
}
