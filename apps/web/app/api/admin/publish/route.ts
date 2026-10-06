import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { isBlobConfigured, publishDraft, status } from '@/lib/experience-store';

export async function POST() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required to publish' },
      { status: 503 }
    );
  }

  try {
    const experience = await publishDraft();
    return NextResponse.json({
      experience,
      status: await status(),
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
