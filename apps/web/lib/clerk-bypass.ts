import type { ArtistSession } from '@/lib/artist-access';

/**
 * Local-only Clerk skip. Must set CLERK_BYPASS=1 and run `next dev`.
 * Never honored in production builds.
 */
export function isClerkBypass(): boolean {
  return (
    process.env.NODE_ENV === 'development' && process.env.CLERK_BYPASS === '1'
  );
}

/** Stable fake admin so draft ownership and brand paths stay consistent. */
export const DEV_BYPASS_SESSION: ArtistSession = {
  userId: 'user_dev_bypass',
  isAdmin: true,
};
