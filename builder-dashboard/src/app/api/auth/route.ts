import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const { api_key } = await request.json();

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Verify the key against the backend
    const res = await fetch(`${BACKEND_URL}/api/v1/me`, {
      headers: { Authorization: `Bearer ${api_key}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const builder = await res.json();

    // Set httpOnly cookie
    const response = NextResponse.json(builder);
    response.cookies.set('ba_api_key', api_key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('ba_api_key', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
