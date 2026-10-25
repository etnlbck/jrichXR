import { useSyncExternalStore } from 'react';

const COARSE_QUERY = '(pointer: coarse)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(COARSE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Touch-first device? `null` during server render, before it is known. */
export function useCoarsePointer(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COARSE_QUERY).matches,
    () => null
  );
}
