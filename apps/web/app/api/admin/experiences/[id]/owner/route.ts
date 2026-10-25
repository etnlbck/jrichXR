import { NextResponse } from 'next/server';
import { isArtistSession, loadAdmin, loadArtist } from '@/lib/artist-access';
import { getArtistBrand, isValidUserId } from '@/lib/brand-store';
import { parseExperienceId } from '@/lib/experience-id';
import {
  canEditExperience,
  getExperienceAccess,
  isBlobConfigured,
  setExperienceOwner,
} from '@/lib/experience-store';

type Params = { params: Promise<{ id: string }> };

async function experienceIdFrom(params: Params['params']) {
  return parseExperienceId((await params).id);
}

/** Owner and that owner's current brand profile, for the editor's live preview. Reassigning is admin-only. */
export async function GET(_request: Request, { params }: Params) {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  const id = await experienceIdFrom(params);
  if (!id) return NextResponse.json({ error: 'invalid_experience_id' }, { status: 400 });
  if (!(await canEditExperience(id, artist))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const access = await getExperienceAccess(id);
  return NextResponse.json({
    ownerUserId: access?.ownerUserId ?? null,
    brand: access ? await getArtistBrand(access.ownerUserId) : {},
    viewerUserId: artist.userId,
    isAdmin: artist.isAdmin,
  });
}

export async function PUT(request: Request, { params }: Params) {
  const admin = await loadAdmin();
  if (!isArtistSession(admin)) return admin;
  if (!isBlobConfigured()) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is required' }, { status: 503 });
  }
  const id = await experienceIdFrom(params);
  if (!id) return NextResponse.json({ error: 'invalid_experience_id' }, { status: 400 });
  let body: { ownerUserId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!isValidUserId(body.ownerUserId)) {
    return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  }
  try {
    const access = await setExperienceOwner(id, body.ownerUserId);
    return NextResponse.json({
      ownerUserId: access.ownerUserId,
      brand: await getArtistBrand(access.ownerUserId),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === 'cannot_modify_default' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
