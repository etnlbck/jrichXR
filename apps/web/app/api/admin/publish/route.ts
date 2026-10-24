import { NextResponse } from 'next/server';
import {
  isArtistSession,
  jsonFromNotFound,
  loadArtist,
} from '@/lib/artist-access';
import { parseExperienceId } from '@/lib/experience-id';
import {
  assertCanEdit,
  isBlobConfigured,
  publishDraft,
  status,
} from '@/lib/experience-store';

export async function POST(request: Request) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required to publish' },
      { status: 503 }
    );
  }

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
    const experience = await publishDraft(id);
    return NextResponse.json({
      experience,
      status: await status(id),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'publish_failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    );
  }
}
