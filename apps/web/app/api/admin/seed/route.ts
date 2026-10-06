import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getSeedExperience } from '@/lib/config';
import {
  isBlobConfigured,
  putDraft,
  seedDraftIfMissing,
  status,
} from '@/lib/experience-store';

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required to seed' },
      { status: 503 }
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
    const experience = await putDraft(getSeedExperience());
    return NextResponse.json({
      experience,
      seeded: true,
      forced: true,
      status: await status(),
    });
  }

  const { experience, seeded } = await seedDraftIfMissing();
  return NextResponse.json({
    experience,
    seeded,
    forced: false,
    status: await status(),
  });
}
