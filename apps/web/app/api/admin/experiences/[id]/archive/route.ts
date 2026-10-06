import { NextResponse } from 'next/server';
import {
  isArtistSession,
  jsonFromNotFound,
  loadArtist,
} from '@/lib/artist-access';
import { parseExperienceId } from '@/lib/experience-id';
import {
  archiveExperience,
  assertCanEdit,
  isBlobConfigured,
  status,
} from '@/lib/experience-store';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required' },
      { status: 503 }
    );
  }

  const { id: raw } = await params;
  const id = parseExperienceId(raw);
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
    const meta = await archiveExperience(id);
    return NextResponse.json({ meta, status: await status(id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'cannot_modify_default') {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
