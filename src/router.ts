// Minimal hash router: "#/recipe/abc", "#/collections", "#/edit/new".
// Hash routing works from any static host and inside embedded previews.

import { useEffect, useState } from 'react';

export type Route =
  | { name: 'library' }
  | { name: 'favorites' }
  | { name: 'collections' }
  | { name: 'collection'; id: string }
  | { name: 'recipe'; id: string }
  | { name: 'cook'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'favorites': return { name: 'favorites' };
    case 'collections': return parts[1] ? { name: 'collection', id: parts[1] } : { name: 'collections' };
    case 'recipe': return parts[1] ? { name: 'recipe', id: parts[1] } : { name: 'library' };
    case 'cook': return parts[1] ? { name: 'cook', id: parts[1] } : { name: 'library' };
    case 'edit': return { name: 'edit', id: parts[1] ?? 'new' };
    case 'settings': return { name: 'settings' };
    default: return { name: 'library' };
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'library': return '#/';
    case 'favorites': return '#/favorites';
    case 'collections': return '#/collections';
    case 'collection': return `#/collections/${encodeURIComponent(route.id)}`;
    case 'recipe': return `#/recipe/${encodeURIComponent(route.id)}`;
    case 'cook': return `#/cook/${encodeURIComponent(route.id)}`;
    case 'edit': return `#/edit/${encodeURIComponent(route.id)}`;
    case 'settings': return '#/settings';
  }
}

export function navigate(route: Route, opts: { replace?: boolean } = {}) {
  const h = href(route);
  const depth = (history.state as { depth?: number } | null)?.depth ?? 0;
  if (opts.replace) history.replaceState({ depth }, '', h);
  else history.pushState({ depth: depth + 1 }, '', h);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Goes back when there is in-app history, otherwise replaces with `fallback`. */
export function goBack(fallback: Route = { name: 'library' }) {
  const depth = (history.state as { depth?: number } | null)?.depth ?? 0;
  if (depth > 0) history.back();
  else navigate(fallback, { replace: true });
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);
  return route;
}
