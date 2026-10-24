import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  isArtistSession,
  jsonFromNotFound,
  loadArtist,
} from '@/lib/artist-access';
import { parseExperienceId } from '@/lib/experience-id';
import { assertCanEdit } from '@/lib/experience-store';
import { HANDOFF_TTL_SECONDS, handoffUrl } from '@/lib/handoff';

/**
 * Mint a short-lived, single-use Clerk sign-in token for the current artist so
 * their phone can open the AR placer without typing a password.
 */
export async function POST(request: Request) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;

  const id = parseExperienceId(new URL(request.url).searchParams.get('id'));
  if (!id) {
    return NextResponse.json({ error: 'invalid_experience_id' }, { status: 400 });
  }

  try {
    await assertCanEdit(id, artist);
  } catch (err) {
    return (
      jsonFromNotFound(err) ??
      NextResponse.json({ error: 'not_found' }, { status: 404 })
    );
  }

  try {
    const client = await clerkClient();
    const token = await client.signInTokens.createSignInToken({
      userId: artist.userId,
      expiresInSeconds: HANDOFF_TTL_SECONDS,
    });
    const origin = new URL(request.url).origin;
    const { hostname } = new URL(origin);
    return NextResponse.json(
      {
        url: handoffUrl(origin, token.token, `/admin/place/${id}`),
        expiresAt: Date.now() + HANDOFF_TTL_SECONDS * 1000,
        localOnly: hostname === 'localhost' || hostname === '127.0.0.1',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: 'handoff_failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
