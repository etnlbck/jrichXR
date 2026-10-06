import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminCookieHeaderEdge } from '@/lib/admin-auth-edge';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage =
    pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
  const isAdminApi =
    pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/api/admin/login');

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const ok = await verifyAdminCookieHeaderEdge(request.headers.get('cookie'));
  if (ok) return NextResponse.next();

  if (isAdminApi) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const login = new URL('/admin/login', request.url);
  login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
