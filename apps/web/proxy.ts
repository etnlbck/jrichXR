import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { resolveArtistSession } from '@/lib/artist-access';

function isPublicAdminAuth(pathname: string): boolean {
  return (
    pathname.startsWith('/admin/sign-in') ||
    pathname.startsWith('/admin/sign-up') ||
    pathname.startsWith('/admin/login')
  );
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const isPending = pathname.startsWith('/admin/pending');
  const isAdminPage =
    pathname.startsWith('/admin') && !isPublicAdminAuth(pathname) && !isPending;
  const isAdminApi = pathname.startsWith('/api/admin');

  if (!isAdminPage && !isAdminApi && !isPending) {
    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    if (isAdminApi) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const signIn = new URL('/admin/sign-in', request.url);
    signIn.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signIn);
  }

  if (isPending) {
    return NextResponse.next();
  }

  const session = await resolveArtistSession(userId, sessionClaims);
  if (session.allowed) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.redirect(new URL('/admin/pending', request.url));
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
