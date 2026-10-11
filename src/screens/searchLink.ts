import { navigate } from '../router';

let pending: string | null = null;

/** Opens the library with `q` in the search field (used by tag chips). */
export function searchFor(q: string) {
  pending = q;
  navigate({ name: 'library' });
}

export function takePendingSearch(): string | null {
  const q = pending;
  pending = null;
  return q;
}
