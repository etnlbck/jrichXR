/** Client-safe path helpers (no Blob SDK / no server config). */

const DEFAULT_ID = 'untitled-no-7';

export function assetPathname(
  assetId: string,
  filename: string,
  id = DEFAULT_ID
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `experiences/${id}/assets/${assetId}/${safe}`;
}
