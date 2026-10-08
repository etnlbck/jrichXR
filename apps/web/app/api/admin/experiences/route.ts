import { NextResponse } from 'next/server';
import { isArtistSession, loadArtist } from '@/lib/artist-access';
import { parseExperienceId } from '@/lib/experience-id';
import {
  createDraftFromSeed,
  isBlobConfigured,
  listExperiences,
} from '@/lib/experience-store';

export async function GET() {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  const listed = await listExperiences(artist);
  return NextResponse.json({ ...listed, isAdmin: artist.isAdmin });
}

export async function POST(request: Request) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required to create experiences' },
      { status: 503 }
    );
  }

  let body: { id?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const id = parseExperienceId(body.id);
  const title = (body.title ?? '').trim();
  if (!id) {
    return NextResponse.json({ error: 'invalid_experience_id' }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  try {
    const experience = await createDraftFromSeed(id, title, artist.userId);
    return NextResponse.json({ experience }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'experience_exists' || message === 'experience_archived') {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message === 'invalid_experience_id') {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
