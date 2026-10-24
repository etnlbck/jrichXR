export const HANDOFF_TTL_SECONDS = 600;

/** The token rides in the fragment so it never reaches server or proxy logs. */
export function handoffUrl(origin: string, token: string, next: string): string {
  const url = new URL('/admin/handoff', origin);
  url.searchParams.set('next', next);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

/** Only same-site admin paths; rejects `//host`, `/\host` and absolute URLs. */
export function safeAdminNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/admin/') || raw.startsWith('//')) return '/admin';
  if (raw.includes('\\') || /[\u0000-\u001f]/.test(raw)) return '/admin';
  return raw;
}
