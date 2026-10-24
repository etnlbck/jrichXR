import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  adminUserIds,
  isArtistSession,
  loadAdmin,
  parseRole,
} from '@/lib/artist-access';

const PAGE_SIZE = 100;

export async function GET() {
  const admin = await loadAdmin();
  if (!isArtistSession(admin)) return admin;

  const client = await clerkClient();
  const envAdmins = adminUserIds();
  const users = [];
  let offset = 0;

  while (true) {
    const page = await client.users.getUserList({
      limit: PAGE_SIZE,
      offset,
      orderBy: '-created_at',
    });
    for (const user of page.data) {
      users.push({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        name: user.fullName,
        imageUrl: user.imageUrl,
        role: parseRole(user.publicMetadata?.role),
        isEnvAdmin: envAdmins.has(user.id),
        lastSignInAt: user.lastSignInAt,
      });
    }
    offset += page.data.length;
    if (page.data.length < PAGE_SIZE || offset >= page.totalCount) break;
  }

  return NextResponse.json({ users, currentUserId: admin.userId });
}
