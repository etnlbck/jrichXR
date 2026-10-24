import { NextResponse } from 'next/server';
import { DraftConflictError } from '@/lib/experience-store';

export function jsonFromDraftConflict(err: unknown): NextResponse | null {
  if (!(err instanceof DraftConflictError)) return null;
  return NextResponse.json(
    {
      error: 'draft_conflict',
      message: 'This draft changed on another device. Reload to get the latest.',
    },
    { status: 409 }
  );
}

/** `baseRevision` from a JSON body: a non-empty string, or undefined. */
export function baseRevisionFrom(body: unknown): string | undefined {
  const value = (body as { baseRevision?: unknown } | null)?.baseRevision;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
