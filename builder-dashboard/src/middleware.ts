import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check for JWT cookie (new flow) or legacy API key cookie
  const token = request.cookies.get('ba_token');
  const legacyApiKey = request.cookies.get('ba_api_key');
  const authValue = token?.value || legacyApiKey?.value;

  if (!authValue) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Inject Authorization header for proxied API requests
  if (pathname.startsWith('/api/v1')) {
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${authValue}`);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
