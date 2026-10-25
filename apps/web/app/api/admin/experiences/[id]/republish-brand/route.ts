import { NextResponse } from 'next/server';
import { isArtistSession, loadArtist } from '@/lib/artist-access';
import { parseExperienceId } from '@/lib/experience-id';
import {
  canEditExperience,
  getMeta,
  isBlobConfigured,
  republishBrand,
} from '@/lib/experience-store';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  if (!isBlobConfigured()) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is required' }, { status: 503 });
  }
  const id = parseExperienceId((await params).id);
  if (!id) return NextResponse.json({ error: 'invalid_experience_id' }, { status: 400 });
  if (!(await canEditExperience(id, artist))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if ((await getMeta(id)).archived) {
    return NextResponse.json({ error: 'archived' }, { status: 409 });
  }
  try {
    return NextResponse.json({ result: await republishBrand(id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: message === 'not_published' ? 409 : 500 });
  }
}
