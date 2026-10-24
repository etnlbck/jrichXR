import type { MuralVec3, PinForm, SpatialPin } from '@jrichforms/experience';

export const PIN_FORM_LABEL: Record<PinForm, string> = {
  finished: 'Finished',
  raw: 'Raw',
  both: 'Both',
};

export function newPinId(): string {
  return `pin-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
}

export const PIN_ID_RE = /^pin-[a-z0-9]+$/;

/**
 * A partial edit to one pin. Only the fields present are changed, so a phone
 * moving a pin does not overwrite a title edited on desktop.
 */
export type PinChange = { id: string } & Partial<Omit<SpatialPin, 'id'>>;

/** Pin edits sent by the phone placer: PATCH /api/admin/experience/pins. */
export type PinChanges = {
  upsert: PinChange[];
  remove: string[];
};

export function emptyPinChanges(): PinChanges {
  return { upsert: [], remove: [] };
}

export function hasPinChanges(changes: PinChanges): boolean {
  return changes.upsert.length > 0 || changes.remove.length > 0;
}

/** Fold `change` into `changes`, merging repeat edits to the same pin. */
export function recordPinChange(changes: PinChanges, change: PinChange): PinChanges {
  const existing = changes.upsert.find((c) => c.id === change.id);
  return {
    upsert: existing
      ? changes.upsert.map((c) => (c.id === change.id ? { ...c, ...change } : c))
      : [...changes.upsert, change],
    remove: changes.remove.filter((id) => id !== change.id),
  };
}

export function recordPinRemoval(changes: PinChanges, id: string): PinChanges {
  return {
    upsert: changes.upsert.filter((c) => c.id !== id),
    remove: changes.remove.includes(id) ? changes.remove : [...changes.remove, id],
  };
}

/** Apply changes on top of `pins`. New pins need a position or are dropped. */
export function applyPinChanges(pins: SpatialPin[], changes: PinChanges): SpatialPin[] {
  const removed = new Set(changes.remove);
  const next = pins.filter((p) => !removed.has(p.id));
  for (const change of changes.upsert) {
    if (removed.has(change.id)) continue;
    const i = next.findIndex((p) => p.id === change.id);
    if (i >= 0) {
      next[i] = { ...next[i], ...change };
    } else if (change.position) {
      next.push({
        title: `Pin ${next.length + 1}`,
        body: '',
        ...change,
        position: change.position,
      });
    }
  }
  return next;
}

function isVec3(value: unknown): value is MuralVec3 {
  const v = value as MuralVec3 | null;
  return (
    v !== null &&
    typeof v === 'object' &&
    [v.x, v.y, v.z].every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

/** Validate an untrusted PATCH body. Returns null when it is malformed. */
export function parsePinChanges(body: unknown): PinChanges | null {
  const b = body as { upsert?: unknown; remove?: unknown } | null;
  if (b === null || typeof b !== 'object') return null;
  const upsertIn = b.upsert ?? [];
  const removeIn = b.remove ?? [];
  if (!Array.isArray(upsertIn) || !Array.isArray(removeIn)) return null;
  if (upsertIn.length + removeIn.length > 200) return null;

  const upsert: PinChange[] = [];
  for (const raw of upsertIn) {
    const c = raw as Record<string, unknown> | null;
    if (c === null || typeof c !== 'object') return null;
    if (typeof c.id !== 'string' || !PIN_ID_RE.test(c.id)) return null;
    const change: PinChange = { id: c.id };
    if (c.position !== undefined) {
      if (!isVec3(c.position)) return null;
      change.position = { x: c.position.x, y: c.position.y, z: c.position.z };
    }
    if (c.form !== undefined) {
      if (c.form !== 'finished' && c.form !== 'raw' && c.form !== 'both') return null;
      change.form = c.form;
    }
    if (c.title !== undefined) {
      if (typeof c.title !== 'string' || c.title.length > 200) return null;
      change.title = c.title;
    }
    if (c.body !== undefined) {
      if (typeof c.body !== 'string' || c.body.length > 5000) return null;
      change.body = c.body;
    }
    upsert.push(change);
  }

  const remove: string[] = [];
  for (const id of removeIn) {
    if (typeof id !== 'string' || !PIN_ID_RE.test(id)) return null;
    remove.push(id);
  }
  return { upsert, remove };
}
