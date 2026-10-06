/**
 * Edge-safe session verify for proxy.ts (Web Crypto).
 * Must stay free of node:crypto.
 */

export const ADMIN_COOKIE = 'jrf_admin_session';

function getSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET ?? null;
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function verifyAdminSessionTokenEdge(
  token: string | undefined | null
): Promise<boolean> {
  const secret = getSecret();
  if (!token || !secret || !process.env.ADMIN_PASSWORD) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const expiry = Number(exp);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  const expected = await hmacSign(exp, secret);
  if (expected.length !== sig.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return ok === 0;
}

export async function verifyAdminCookieHeaderEdge(
  cookieHeader: string | null
): Promise<boolean> {
  if (!cookieHeader) return false;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  if (!match) return false;
  const value = decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1));
  return verifyAdminSessionTokenEdge(value);
}
