export const DEFAULT_EXPERIENCE_ID = 'untitled-no-7';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED = new Set([
  'admin',
  'api',
  'shop',
  'marker',
  'e',
  'login',
]);

export function isValidExperienceId(id: string): boolean {
  return SLUG.test(id) && !RESERVED.has(id);
}

export function parseExperienceId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const id = raw.trim();
  return isValidExperienceId(id) ? id : null;
}

export function visitorArPath(id: string): string {
  return id === DEFAULT_EXPERIENCE_ID ? '/' : `/e/${id}`;
}

export function visitorShopPath(id: string): string {
  return id === DEFAULT_EXPERIENCE_ID ? '/shop' : `/e/${id}/shop`;
}
