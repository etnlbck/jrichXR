import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export type ArtistRole = 'artist' | 'admin';

export type ArtistSession = {
  userId: string;
  isAdmin: boolean;
};

export type ArtistResolution = ArtistSession & {
  allowed: boolean;
  role: ArtistRole | null;
};

export class ArtistAccessError extends Error {
  readonly status: 401 | 403;
  readonly code: 'unauthorized' | 'forbidden';

  constructor(status: 401 | 403, code: 'unauthorized' | 'forbidden') {
    super(code);
    this.name = 'ArtistAccessError';
    this.status = status;
    this.code = code;
  }
}

export function artistAccessMode(): 'signed_in' | 'allowlist' {
  return process.env.ARTIST_ACCESS === 'allowlist' ? 'allowlist' : 'signed_in';
}

function adminUserIds(): Set<string> {
  return new Set(
    (process.env.CLERK_ADMIN_USER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function parseRole(value: unknown): ArtistRole | null {
  return value === 'artist' || value === 'admin' ? value : null;
}

function roleFromClaims(sessionClaims: unknown): ArtistRole | null {
  if (!sessionClaims || typeof sessionClaims !== 'object') return null;
  const claims = sessionClaims as {
    metadata?: { role?: unknown };
    publicMetadata?: { role?: unknown };
  };
  return (
    parseRole(claims.metadata?.role) ?? parseRole(claims.publicMetadata?.role)
  );
}

export async function resolveArtistSession(
  userId: string,
  sessionClaims?: unknown
): Promise<ArtistResolution> {
  let role = roleFromClaims(sessionClaims);
  if (!role) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      role = parseRole(user.publicMetadata?.role);
    } catch {
      role = null;
    }
  }

  const isAdmin = role === 'admin' || adminUserIds().has(userId);
  const allowed =
    artistAccessMode() === 'signed_in' || isAdmin || role === 'artist';

  return { userId, isAdmin, allowed, role };
}

export async function requireArtist(): Promise<ArtistSession> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new ArtistAccessError(401, 'unauthorized');
  }
  const session = await resolveArtistSession(userId, sessionClaims);
  if (!session.allowed) {
    throw new ArtistAccessError(403, 'forbidden');
  }
  return { userId: session.userId, isAdmin: session.isAdmin };
}

export function jsonFromArtistError(err: unknown): NextResponse | null {
  if (!(err instanceof ArtistAccessError)) return null;
  return NextResponse.json({ error: err.code }, { status: err.status });
}

export async function loadArtist(): Promise<ArtistSession | NextResponse> {
  try {
    return await requireArtist();
  } catch (err) {
    return (
      jsonFromArtistError(err) ??
      NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    );
  }
}

export function isArtistSession(
  value: ArtistSession | NextResponse
): value is ArtistSession {
  return !(value instanceof NextResponse);
}

export function jsonFromNotFound(err: unknown): NextResponse | null {
  if (err instanceof Error && err.message === 'not_found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return null;
}
