import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/home.html', '/skill.md'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Dev mode: Supabase not configured — use dev-session cookie
  if (!supabaseUrl || !supabaseAnonKey) {
    const devSession = request.cookies.get('dev-session')?.value;
    if (devSession) {
      return NextResponse.next();
    }
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/home.html', request.url));
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Production mode: Supabase auth
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { session } } = await supabase.auth.getSession();

  // For API proxy routes, inject auth token and strip cookies (backend only needs Bearer token)
  if (pathname.startsWith('/api/')) {
    if (session?.access_token) {
      const headers = new Headers(request.headers);
      headers.set('Authorization', `Bearer ${session.access_token}`);
      headers.delete('cookie');
      return NextResponse.next({ request: { headers } });
    }
    return NextResponse.next();
  }

  // For pages, require auth
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/home.html', request.url));
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|skill\\.md).*)'],
};
