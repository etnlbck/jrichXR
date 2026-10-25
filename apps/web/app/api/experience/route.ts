import { NextResponse } from 'next/server';
import { DEFAULT_EXPERIENCE_ID } from '@/lib/config';
import { parseExperienceId } from '@/lib/experience-id';
import {
  ExperienceNotFoundError,
  loadExperience,
} from '@/lib/load-experience';

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('id');
  const id = raw ? parseExperienceId(raw) : DEFAULT_EXPERIENCE_ID;
  if (!id) {
    return NextResponse.json({ error: 'invalid_experience_id' }, { status: 400 });
  }
  try {
    const loaded = await loadExperience(id);
    return NextResponse.json({
      experience: loaded.experience,
      config: loaded.config,
      source: loaded.source,
    });
  } catch (err) {
    if (err instanceof ExperienceNotFoundError) {
      // #region agent log
      fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '5ef31a',
        },
        body: JSON.stringify({
          sessionId: '5ef31a',
          runId: 'pre-fix',
          hypothesisId: 'A-B-D',
          location: 'api/experience/route.ts:404',
          message: 'experience API not_found',
          data: { id, reason: err.reason },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json(
        { error: 'not_found', reason: err.reason },
        { status: 404 }
      );
    }
    throw err;
  }
}
