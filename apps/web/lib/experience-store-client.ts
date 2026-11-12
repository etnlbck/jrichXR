/** Client-safe path helpers (no Blob SDK / no server config). */

export function assetPathname(
  assetId: string,
  filename: string,
  id: string
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `experiences/${id}/assets/${assetId}/${safe}`;
}

/** Must match `brandAssetPrefix` in brand-store; the server adds a random suffix. */
export function brandAssetPathname(
  userId: string,
  assetId: 'logo' | 'share',
  filename: string
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `artists/${userId}/brand/${assetId}/${safe}`;
}
