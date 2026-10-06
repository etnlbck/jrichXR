import { NextResponse } from 'next/server';
import {
  isArtistSession,
  jsonFromNotFound,
  loadArtist,
} from '@/lib/artist-access';
import { DEFAULT_EXPERIENCE_ID, getSeedExperience } from '@/lib/config';
import { parseExperienceId } from '@/lib/experience-id';
import {
  assertCanEdit,
  cloneSeedForId,
  getDraft,
  isBlobConfigured,
  putDraft,
  seedDraftIfMissing,
  status,
} from '@/lib/experience-store';

export async function POST(request: Request) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required to seed' },
      { status: 503 }
    );
  }

  const id =
    parseExperienceId(new URL(request.url).searchParams.get('id')) ??
    DEFAULT_EXPERIENCE_ID;

  try {
    await assertCanEdit(id, artist);
  } catch (err) {
    return (
      jsonFromNotFound(err) ??
      NextResponse.json({ error: 'not_found' }, { status: 404 })
    );
  }

  let force = false;
  try {
    const body = await request.json();
    force = body?.force === true;
  } catch {
    /* empty body ok */
  }

  if (force) {
    const current = await getDraft(id);
    const experience =
      id === DEFAULT_EXPERIENCE_ID
        ? await putDraft(getSeedExperience(), id)
        : await putDraft(
            cloneSeedForId(
              id,
              current?.gallery.provenance.title ?? id
            ),
            id
          );
    return NextResponse.json({
      experience,
      seeded: true,
      forced: true,
      status: await status(id),
    });
  }

  try {
    const { experience, seeded } = await seedDraftIfMissing(id);
    return NextResponse.json({
      experience,
      seeded,
      forced: false,
      status: await status(id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'experience_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
