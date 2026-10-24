import { NextResponse } from 'next/server';
import { parseGalleryExperience } from '@jrichforms/experience';
import {
  isArtistSession,
  jsonFromNotFound,
  loadArtist,
} from '@/lib/artist-access';
import { DEFAULT_EXPERIENCE_ID } from '@/lib/config';
import { baseRevisionFrom, jsonFromDraftConflict } from '@/lib/draft-response';
import { parseExperienceId } from '@/lib/experience-id';
import {
  assertCanEdit,
  isBlobConfigured,
  putDraftWithRevision,
  seedDraftIfMissing,
  status,
} from '@/lib/experience-store';

function idFromRequest(request: Request): string | null {
  return parseExperienceId(new URL(request.url).searchParams.get('id'));
}

export async function GET(request: Request) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;

  const id = idFromRequest(request);
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

  const st = await status(id);

  if (id === DEFAULT_EXPERIENCE_ID && !isBlobConfigured()) {
    const { experience } = await seedDraftIfMissing(id);
    return NextResponse.json({
      experience,
      status: st,
      warning: 'BLOB_READ_WRITE_TOKEN unset — showing seed; saves require Blob',
    });
  }

  try {
    const { experience, seeded, revision } = await seedDraftIfMissing(id);
    return NextResponse.json({ experience, revision, status: st, seeded });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'experience_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required to save drafts' },
      { status: 503 }
    );
  }

  const id = idFromRequest(request);
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

  const baseRevision = baseRevisionFrom(body);
  if (!baseRevision) {
    return NextResponse.json(
      { error: 'base_revision_required', message: 'Reload the editor and try again.' },
      { status: 400 }
    );
  }

  try {
    const experience = parseGalleryExperience(
      (body as { experience?: unknown })?.experience ?? body
    );
    const saved = await putDraftWithRevision(experience, id, baseRevision);
    return NextResponse.json({
      experience: saved.experience,
      revision: saved.revision,
      status: await status(id),
      draftExists: true,
    });
  } catch (err) {
    const conflict = jsonFromDraftConflict(err);
    if (conflict) return conflict;
    return NextResponse.json(
      {
        error: 'invalid_experience',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    );
  }
}
