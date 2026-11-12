import { NextResponse } from 'next/server';
import { isBlobConfigured } from '@/lib/experience-store';
import { sendTesterConfirmation } from '@/lib/tester-email';
import {
  checkAndTouchRateLimit,
  clientIpFromHeaders,
  createTester,
  normalizeEmail,
  normalizeNote,
  normalizeUtm,
  updateTesterNote,
} from '@/lib/testers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Honeypot — pretend success without storing or emailing.
  const honeypot = body.company ?? body.website ?? body.honeypot;
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return NextResponse.json({ ok: true, id: crypto.randomUUID(), emailed: true });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  if (!isBlobConfigured()) {
    return NextResponse.json({ error: 'storage_unavailable' }, { status: 503 });
  }

  const ip = clientIpFromHeaders(request.headers);
  const allowed = await checkAndTouchRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const id = crypto.randomUUID();
  try {
    await createTester({
      id,
      email,
      utmSource: normalizeUtm(body.utmSource),
      utmMedium: normalizeUtm(body.utmMedium),
      utmCampaign: normalizeUtm(body.utmCampaign),
      utmContent: normalizeUtm(body.utmContent),
    });
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 503 });
  }

  const emailed = await sendTesterConfirmation({ email, id });
  return NextResponse.json({ ok: true, id, emailed }, { status: 201 });
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const note = normalizeNote(body.note);
  if (!note) {
    return NextResponse.json({ ok: true });
  }

  if (!isBlobConfigured()) {
    return NextResponse.json({ error: 'storage_unavailable' }, { status: 503 });
  }

  const ip = clientIpFromHeaders(request.headers);
  const allowed = await checkAndTouchRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  try {
    const updated = await updateTesterNote(id, note);
    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
