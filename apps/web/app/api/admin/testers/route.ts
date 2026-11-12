import { NextResponse } from 'next/server';
import { isArtistSession, loadAdmin } from '@/lib/artist-access';
import { listTesters } from '@/lib/testers';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await loadAdmin();
  if (!isArtistSession(admin)) return admin;

  const testers = await listTesters(500);
  const unique = new Set(testers.map((t) => t.email.toLowerCase()));

  return NextResponse.json({
    testers: testers.map((t) => ({
      id: t.id,
      email: t.email,
      createdAt: t.createdAt,
      utmSource: t.utmSource,
      utmMedium: t.utmMedium,
      utmCampaign: t.utmCampaign,
      utmContent: t.utmContent,
      note: t.note,
    })),
    uniqueCount: unique.size,
  });
}
