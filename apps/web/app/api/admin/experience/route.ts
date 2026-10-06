import { NextResponse } from 'next/server';
import { parseGalleryExperience } from '@jrichforms/experience';
import { requireAdminSession } from '@/lib/admin-auth';
import { DEFAULT_EXPERIENCE_ID } from '@/lib/config';
import {
  getDraft,
  isBlobConfigured,
  putDraft,
  seedDraftIfMissing,
  status,
} from '@/lib/experience-store';

export async function GET() {
  // #region agent log
  const _t0 = Date.now();
  fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88764b'},body:JSON.stringify({sessionId:'88764b',runId:'pre-fix',hypothesisId:'B,C,E',location:'api/admin/experience:GET:entry',message:'GET experience entered',data:{blobConfigured:isBlobConfigured()},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!(await requireAdminSession())) {
    // #region agent log
    fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88764b'},body:JSON.stringify({sessionId:'88764b',runId:'pre-fix',hypothesisId:'E',location:'api/admin/experience:GET:unauthorized',message:'session missing',data:{ms:Date.now()-_t0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const st = await status(DEFAULT_EXPERIENCE_ID);
  // #region agent log
  fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88764b'},body:JSON.stringify({sessionId:'88764b',runId:'pre-fix',hypothesisId:'B,C',location:'api/admin/experience:GET:status',message:'status() resolved',data:{st,ms:Date.now()-_t0},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!isBlobConfigured()) {
    const { experience } = await seedDraftIfMissing();
    // #region agent log
    fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88764b'},body:JSON.stringify({sessionId:'88764b',runId:'pre-fix',hypothesisId:'C',location:'api/admin/experience:GET:seed-no-blob',message:'returning seed without blob',data:{hasExperience:!!experience,ms:Date.now()-_t0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json({
      experience,
      status: st,
      warning: 'BLOB_READ_WRITE_TOKEN unset — showing seed; saves require Blob',
    });
  }

  const { experience, seeded } = await seedDraftIfMissing();
  // #region agent log
  fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88764b'},body:JSON.stringify({sessionId:'88764b',runId:'pre-fix',hypothesisId:'B',location:'api/admin/experience:GET:done',message:'returning draft',data:{seeded,hasExperience:!!experience,version:experience?.version??null,ms:Date.now()-_t0},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return NextResponse.json({ experience, status: st, seeded });
}

export async function PUT(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required to save drafts' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const experience = parseGalleryExperience(
      (body as { experience?: unknown })?.experience ?? body
    );
    const saved = await putDraft(experience);
    const draft = await getDraft();
    return NextResponse.json({
      experience: saved,
      status: await status(),
      draftExists: !!draft,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'invalid_experience',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    );
  }
}
