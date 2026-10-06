import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE } from '@/lib/admin-auth-edge';

export { ADMIN_COOKIE };
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set');
  }
  return secret;
}

function adminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    throw new Error('ADMIN_PASSWORD is not set');
  }
  return pw;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createAdminSessionToken(now = Date.now()): string {
  const exp = String(now + SESSION_TTL_MS);
  const sig = sign(exp);
  return `${exp}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || !isAdminConfigured()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const expiry = Number(exp);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  const expected = sign(exp);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyAdminPassword(password: string): boolean {
  if (!isAdminConfigured()) return false;
  const expected = adminPassword();
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Server Components / Route Handlers */
export async function requireAdminSession(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);
}
