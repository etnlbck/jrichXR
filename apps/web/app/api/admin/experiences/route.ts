import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { parseExperienceId } from '@/lib/experience-id';
import {
  createDraftFromSeed,
  isBlobConfigured,
  listExperiences,
} from '@/lib/experience-store';

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const listed = await listExperiences();
  return NextResponse.json(listed);
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
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
    const experience = await createDraftFromSeed(id, title);
    return NextResponse.json({ experience }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'experience_exists') {
      return NextResponse.json({ error: 'experience_exists' }, { status: 409 });
    }
    if (message === 'invalid_experience_id') {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
