import { NextResponse } from 'next/server';

const ALLOWED = new Set([
  'boot',
  'first_target_found',
  'reveal_start',
  'reveal_complete',
  'reveal_cancel',
  'tracking_lost_post_reveal',
]);

const DEVICE_CLASSES = new Set(['mobile', 'tablet', 'desktop', 'unknown']);

/**
 * Field-test sink for visitor activation marks.
 * Enabled client-side only when NEXT_PUBLIC_METRICS=1.
 * Emits structured JSON for Vercel log drains / Observability queries.
 */
export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_METRICS !== '1') {
    return new NextResponse(null, { status: 204 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const r = body as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name : '';
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ error: 'unknown_event' }, { status: 400 });
  }
  const ms = typeof r.ms === 'number' && Number.isFinite(r.ms) ? r.ms : null;
  const experienceId =
    typeof r.experienceId === 'string' ? r.experienceId.slice(0, 80) : null;
  const deviceClass =
    typeof r.deviceClass === 'string' && DEVICE_CLASSES.has(r.deviceClass)
      ? r.deviceClass
      : 'unknown';
  // Structured line for log drains: filter type:"jrf_metric" in Vercel Observability.
  console.info(
    JSON.stringify({
      type: 'jrf_metric',
      name,
      ms,
      experienceId,
      deviceClass,
      t: typeof r.t === 'number' ? r.t : Date.now(),
    })
  );
  return new NextResponse(null, { status: 204 });
}
