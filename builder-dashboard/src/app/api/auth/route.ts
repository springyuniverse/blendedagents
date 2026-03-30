import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, display_name, api_key } = body;

    // Legacy API key login (backwards compatible)
    if (api_key) {
      const res = await fetch(`${BACKEND_URL}/api/v1/me`, {
        headers: { Authorization: `Bearer ${api_key}` },
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }

      const builder = await res.json();
      const response = NextResponse.json(builder);
      response.cookies.set('ba_token', api_key, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      return response;
    }

    if (action === 'signup') {
      if (!email || !password || !display_name) {
        return NextResponse.json({ error: 'Email, password, and display name are required' }, { status: 400 });
      }

      const res = await fetch(`${BACKEND_URL}/auth/builder/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error?.message || data.error || 'Signup failed';
        return NextResponse.json({ error: message }, { status: res.status });
      }

      const response = NextResponse.json({ builder: data.builder, api_key: data.api_key });
      response.cookies.set('ba_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days (matches JWT expiry)
      });
      return response;
    }

    // Default: login
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL}/auth/builder/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const message = data.error?.message || data.error || 'Invalid email or password';
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const response = NextResponse.json({ builder: data.builder });
    response.cookies.set('ba_token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('ba_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  // Also clear legacy cookie
  response.cookies.set('ba_api_key', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
