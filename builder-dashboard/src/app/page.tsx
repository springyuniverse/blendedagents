'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { checkAdminAccess } from '@/lib/admin-api';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Dev mode: check cookie
    if (!SUPABASE_CONFIGURED) {
      const match = document.cookie.match(/dev-session=([^;:]+)/);
      if (match) {
        const role = match[1];
        router.replace(role === 'admin' ? '/admin' : role === 'tester' ? '/tester/tasks' : '/builder');
      } else {
        router.replace('/login');
      }
      return;
    }

    // Production: detect role from Supabase
    async function detectRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      // Check admin first — if their email is in ADMIN_EMAILS, route to admin panel
      const isAdmin = await checkAdminAccess();
      if (isAdmin) {
        router.replace('/admin');
        return;
      }

      // Check if user is a builder
      const { data: builder } = await supabase
        .from('builders')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (builder) {
        router.replace('/builder');
        return;
      }

      // Check if user is a tester
      const { data: tester } = await supabase
        .from('testers')
        .select('id, onboarded')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (tester) {
        router.replace(tester.onboarded ? '/tester/tasks' : '/onboarding');
        return;
      }

      // No profile found — send back to login
      router.replace('/login');
    }

    detectRole();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-5 h-5 border-2 border-accent-flow border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
