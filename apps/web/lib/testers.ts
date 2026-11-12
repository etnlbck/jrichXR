import { createHash } from 'node:crypto';
import {
  BlobNotFoundError,
  get,
  list,
  put,
} from '@vercel/blob';
import { isBlobConfigured } from '@/lib/experience-store';

export type TesterRecord = {
  id: string;
  email: string;
  createdAt: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  note: string | null;
};

const RATE_WINDOW_MS = 60_000;
const UTM_MAX = 80;
const NOTE_MAX = 1000;
const EMAIL_MAX = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function testerPath(id: string): string {
  return `testers/${id}.json`;
}

function ratePath(hash: string): string {
  return `testers-rate/${hash}.json`;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX) return null;
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

export function normalizeUtm(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().slice(0, UTM_MAX);
  return value.length > 0 ? value : null;
}

export function normalizeNote(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const note = raw.trim().slice(0, NOTE_MAX);
  return note.length > 0 ? note : null;
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

/**
 * Returns false when the IP is still inside the cooldown window.
 * Failures reading the rate blob allow the request through.
 */
export async function checkAndTouchRateLimit(ip: string): Promise<boolean> {
  if (!isBlobConfigured()) return true;
  const hash = hashIp(ip);
  const pathname = ratePath(hash);
  const now = Date.now();

  try {
    const res = await get(pathname, { access: 'private', useCache: false });
    if (res !== null && res.statusCode === 200) {
      const json = (await new Response(res.stream).json()) as { at?: number };
      if (typeof json.at === 'number' && now - json.at < RATE_WINDOW_MS) {
        return false;
      }
    }
  } catch (err) {
    if (!(err instanceof BlobNotFoundError)) {
      // Continue — rate store outage should not block signups.
    }
  }

  try {
    await put(pathname, JSON.stringify({ at: now }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
  } catch {
    // Ignore rate-write failures; signup still proceeds.
  }

  return true;
}

export async function createTester(
  input: Omit<TesterRecord, 'createdAt' | 'note'> & { note?: null }
): Promise<TesterRecord> {
  if (!isBlobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  }
  const record: TesterRecord = {
    id: input.id,
    email: input.email,
    createdAt: new Date().toISOString(),
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    utmContent: input.utmContent,
    note: null,
  };
  await put(testerPath(record.id), JSON.stringify(record, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: 0,
  });
  return record;
}

export async function getTester(id: string): Promise<TesterRecord | null> {
  if (!isBlobConfigured()) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const res = await get(testerPath(id), { access: 'private', useCache: false });
    if (res === null || res.statusCode !== 200) return null;
    const json = (await new Response(res.stream).json()) as TesterRecord;
    if (!json?.id || !json?.email) return null;
    return json;
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}

export async function updateTesterNote(
  id: string,
  note: string
): Promise<TesterRecord | null> {
  const existing = await getTester(id);
  if (!existing) return null;
  const next: TesterRecord = { ...existing, note };
  await put(testerPath(id), JSON.stringify(next, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return next;
}

export async function listTesters(limit = 500): Promise<TesterRecord[]> {
  if (!isBlobConfigured()) return [];
  const records: TesterRecord[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({
      prefix: 'testers/',
      cursor,
      limit: 1000,
    });
    for (const blob of result.blobs) {
      if (!blob.pathname.startsWith('testers/')) continue;
      if (blob.pathname.startsWith('testers-rate/')) continue;
      if (!blob.pathname.endsWith('.json')) continue;
      try {
        const res = await get(blob.pathname, {
          access: 'private',
          useCache: false,
        });
        if (res === null || res.statusCode !== 200) continue;
        const json = (await new Response(res.stream).json()) as TesterRecord;
        if (json?.id && json?.email) records.push(json);
      } catch {
        // Skip unreadable blobs.
      }
      if (records.length >= limit) break;
    }
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor && records.length < limit);

  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return records.slice(0, limit);
}
