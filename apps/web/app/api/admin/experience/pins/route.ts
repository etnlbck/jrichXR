import { NextResponse } from 'next/server';
import {
  isArtistSession,
  jsonFromNotFound,
  loadArtist,
} from '@/lib/artist-access';
import { parseExperienceId } from '@/lib/experience-id';
import {
  assertCanEdit,
  DraftConflictError,
  getDraftWithRevision,
  isBlobConfigured,
  putDraftWithRevision,
  seedDraftIfMissing,
} from '@/lib/experience-store';
import { applyPinChanges, parsePinChanges } from '@/lib/pins';

/**
 * Apply pin edits on top of the latest draft. Only `gallery.pins` changes, and
 * edits are merged per pin, so other draft edits made elsewhere are kept.
 */
export async function PATCH(request: Request) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required to save pins' },
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const changes = parsePinChanges(body);
  if (changes === null) {
    return NextResponse.json({ error: 'invalid_pins' }, { status: 400 });
  }

  try {
    await seedDraftIfMissing(id);
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await getDraftWithRevision(id);
    if (current === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const pins = applyPinChanges(current.experience.gallery.pins ?? [], changes);
    try {
      const saved = await putDraftWithRevision(
        {
          ...current.experience,
          gallery: { ...current.experience.gallery, pins },
        },
        id,
        current.revision
      );
      return NextResponse.json({
        pins: saved.experience.gallery.pins ?? [],
        revision: saved.revision,
      });
    } catch (err) {
      if (!(err instanceof DraftConflictError)) {
        return NextResponse.json(
          {
            error: 'save_failed',
            message: err instanceof Error ? err.message : String(err),
          },
          { status: 500 }
        );
      }
    }
  }
  return NextResponse.json(
    { error: 'draft_conflict', message: 'The draft is busy. Try again.' },
    { status: 409 }
  );
}
