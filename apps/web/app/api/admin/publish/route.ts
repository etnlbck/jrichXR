import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { parseExperienceId } from '@/lib/experience-id';
import { isBlobConfigured, publishDraft, status } from '@/lib/experience-store';

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
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
