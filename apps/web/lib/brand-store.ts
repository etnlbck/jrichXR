import { BlobNotFoundError, get, put } from '@vercel/blob';
import { sanitizeBrand, type ArtistBrand } from '@jrichforms/experience';

const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidUserId(value: unknown): value is string {
  return typeof value === 'string' && USER_ID.test(value);
}

export function brandPath(userId: string): string {
  return `artists/${userId}/brand.json`;
}

export function brandAssetPrefix(userId: string, assetId: 'logo' | 'share'): string {
  return `artists/${userId}/brand/${assetId}/`;
}

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Read from origin: profiles are overwritten in place and edited read-modify-write. */
export async function getArtistBrand(userId: string): Promise<ArtistBrand> {
  if (!blobConfigured() || !isValidUserId(userId)) return {};
  try {
    const res = await get(brandPath(userId), { access: 'public', useCache: false });
    if (res === null || res.statusCode !== 200) return {};
    return sanitizeBrand(await new Response(res.stream).json());
  } catch (err) {
    if (err instanceof BlobNotFoundError) return {};
    throw err;
  }
}

export async function putArtistBrand(
  userId: string,
  brand: unknown
): Promise<ArtistBrand> {
  if (!blobConfigured()) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  if (!isValidUserId(userId)) throw new Error('invalid_user_id');
  const clean = sanitizeBrand(brand);
  await put(brandPath(userId), JSON.stringify(clean, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  return clean;
}

export async function patchArtistBrand(
  userId: string,
  patch: Partial<ArtistBrand>
): Promise<ArtistBrand> {
  const current = await getArtistBrand(userId);
  return putArtistBrand(userId, { ...current, ...patch });
}
