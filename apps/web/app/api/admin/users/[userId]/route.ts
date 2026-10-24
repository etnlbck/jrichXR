import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  adminUserIds,
  isArtistSession,
  loadAdmin,
  parseRole,
} from '@/lib/artist-access';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await loadAdmin();
  if (!isArtistSession(admin)) return admin;

  const { userId } = await params;

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!('role' in body)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }
  const role = body.role === null ? null : parseRole(body.role);
  if (body.role !== null && role === null) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  if (userId === admin.userId && role !== 'admin') {
    return NextResponse.json({ error: 'cannot_demote_self' }, { status: 409 });
  }

  const client = await clerkClient();
  try {
    const user = await client.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        name: user.fullName,
        imageUrl: user.imageUrl,
        role: parseRole(user.publicMetadata?.role),
        isEnvAdmin: adminUserIds().has(user.id),
        lastSignInAt: user.lastSignInAt,
      },
    });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
