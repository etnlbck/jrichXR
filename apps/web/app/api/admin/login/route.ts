import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  createAdminSessionToken,
  isAdminConfigured,
  verifyAdminPassword,
} from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'Admin auth is not configured (ADMIN_PASSWORD / ADMIN_SESSION_SECRET)' },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!verifyAdminPassword(body.password ?? '')) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 401 });
  }

  const token = createAdminSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}
