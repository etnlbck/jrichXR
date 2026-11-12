import { NextResponse } from 'next/server';
import { isArtistSession, loadArtist, type ArtistSession } from '@/lib/artist-access';
import { getArtistBrand, isValidUserId, putArtistBrand } from '@/lib/brand-store';
import { isBlobConfigured } from '@/lib/experience-store';

/** Artists edit their own profile; admins may target another artist with ?userId=. */
function targetUserId(request: Request, artist: ArtistSession): string | NextResponse {
  const requested = new URL(request.url).searchParams.get('userId');
  if (!requested || requested === artist.userId) return artist.userId;
  if (!artist.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!isValidUserId(requested)) {
    return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  }
  return requested;
}

export async function GET(request: Request) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  const userId = targetUserId(request, artist);
  if (userId instanceof NextResponse) return userId;
  return NextResponse.json({
    userId,
    brand: await getArtistBrand(userId),
    blobConfigured: isBlobConfigured(),
  });
}

export async function PUT(request: Request) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  if (!isBlobConfigured()) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is required' }, { status: 503 });
  }
  const userId = targetUserId(request, artist);
  if (userId instanceof NextResponse) return userId;
  let body: { brand?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const brand = await putArtistBrand(userId, body.brand);
  return NextResponse.json({ userId, brand });
}
