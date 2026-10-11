import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Category, Collection, CookingProgress, LibrarySnapshot, Recipe } from './types';
import { createRepository, MemoryRepository, uid, type Repository } from './data/repository';
import { seedSnapshot } from './data/seed';
import { upgradeSeed } from './data/upgrade';

type Action =
  | { type: 'replace'; snapshot: LibrarySnapshot }
  | { type: 'upsertRecipe'; recipe: Recipe }
  | { type: 'deleteRecipe'; id: string }
  | { type: 'toggleFavorite'; id: string }
  | { type: 'viewed'; id: string }
  | { type: 'cooked'; id: string }
  | { type: 'progress'; id: string; progress: Partial<CookingProgress> | null }
  | { type: 'addCategory'; category: Category }
  | { type: 'renameCategory'; id: string; name: string }
  | { type: 'deleteCategory'; id: string }
  | { type: 'moveCategory'; id: string; delta: number }
  | { type: 'upsertCollection'; collection: Collection }
  | { type: 'deleteCollection'; id: string }
  | { type: 'toggleInCollection'; collectionId: string; recipeId: string };

function mapRecipe(s: LibrarySnapshot, id: string, fn: (r: Recipe) => Recipe): LibrarySnapshot {
  return { ...s, recipes: s.recipes.map((r) => (r.id === id ? fn(r) : r)) };
}

function reducer(s: LibrarySnapshot, a: Action): LibrarySnapshot {
  switch (a.type) {
    case 'replace':
      return a.snapshot;
    case 'upsertRecipe': {
      const exists = s.recipes.some((r) => r.id === a.recipe.id);
      const recipe = { ...a.recipe, updatedAt: Date.now() };
      return { ...s, recipes: exists ? s.recipes.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...s.recipes] };
    }
    case 'deleteRecipe': {
      const { [a.id]: _gone, ...progress } = s.progress;
      return {
        ...s,
        progress,
        recipes: s.recipes.filter((r) => r.id !== a.id),
        collections: s.collections.map((c) => ({ ...c, recipeIds: c.recipeIds.filter((id) => id !== a.id) })),
      };
    }
    case 'toggleFavorite':
      return mapRecipe(s, a.id, (r) => ({ ...r, favorite: !r.favorite }));
    case 'viewed':
      return mapRecipe(s, a.id, (r) => ({ ...r, lastViewedAt: Date.now(), viewCount: r.viewCount + 1 }));
    case 'cooked':
      return mapRecipe(s, a.id, (r) => ({ ...r, lastCookedAt: Date.now(), cookCount: r.cookCount + 1 }));
    case 'progress': {
      const progress = { ...s.progress };
      if (a.progress === null) delete progress[a.id];
      else progress[a.id] = { ...({ ingredients: [], steps: [] } as Pick<CookingProgress, 'ingredients' | 'steps'>), ...(progress[a.id] as CookingProgress | undefined), ...a.progress, updatedAt: Date.now() };
      return { ...s, progress };
    }
    case 'addCategory':
      return { ...s, categories: [...s.categories, a.category] };
    case 'renameCategory':
      return { ...s, categories: s.categories.map((c) => (c.id === a.id ? { ...c, name: a.name } : c)) };
    case 'deleteCategory':
      return {
        ...s,
        categories: s.categories.filter((c) => c.id !== a.id),
        recipes: s.recipes.map((r) => (r.categoryIds.includes(a.id) ? { ...r, categoryIds: r.categoryIds.filter((c) => c !== a.id) } : r)),
      };
    case 'moveCategory': {
      const list = [...s.categories];
      const i = list.findIndex((c) => c.id === a.id);
      const j = i + a.delta;
      if (i < 0 || j < 0 || j >= list.length) return s;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...s, categories: list };
    }
    case 'upsertCollection': {
      const exists = s.collections.some((c) => c.id === a.collection.id);
      return {
        ...s,
        collections: exists ? s.collections.map((c) => (c.id === a.collection.id ? a.collection : c)) : [...s.collections, a.collection],
      };
    }
    case 'deleteCollection':
      return { ...s, collections: s.collections.filter((c) => c.id !== a.id) };
    case 'toggleInCollection':
      return {
        ...s,
        collections: s.collections.map((c) =>
          c.id !== a.collectionId
            ? c
            : { ...c, recipeIds: c.recipeIds.includes(a.recipeId) ? c.recipeIds.filter((id) => id !== a.recipeId) : [...c.recipeIds, a.recipeId] },
        ),
      };
  }
}

interface Store {
  state: LibrarySnapshot;
  dispatch: (a: Action) => void;
  ready: boolean;
  /** False when the browser blocked storage; changes then last for this visit only. */
  persistent: boolean;
  /** Where recipes are saved: "Home server", "This device" or "This visit only". */
  storageLabel: string;
  /** True when a save to the home server failed; shown so nobody loses work silently. */
  saveError: boolean;
  resetToSamples: () => void;
  newId: () => string;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedSnapshot);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [storageLabel, setStorageLabel] = useState('This device');
  const [saveError, setSaveError] = useState(false);
  const repo = useRef<Repository | null>(null);
  const skipSave = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    createRepository().then(async (r) => {
      repo.current = r;
      setPersistent(!(r instanceof MemoryRepository));
      setStorageLabel(r.label);
      const saved = await r.load().catch(() => null);
      if (!cancelled && saved?.version === 1) {
        const upgraded = upgradeSeed(saved);
        skipSave.current = upgraded === saved;
        dispatch({ type: 'replace', snapshot: upgraded });
      }
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Save shortly after each change; quick successive edits collapse into one write.
  useEffect(() => {
    if (!ready || !repo.current) return;
    if (skipSave.current) { skipSave.current = false; return; }
    pending.current = true;
    const t = setTimeout(() => {
      repo.current?.save(state)
        .then(() => { pending.current = false; setSaveError(false); })
        .catch(() => { pending.current = false; if (repo.current?.pull) setSaveError(true); else setPersistent(false); });
    }, repo.current.saveDelay ?? 250);
    return () => clearTimeout(t);
  }, [state, ready]);

  // Online saves wait a few seconds; don't lose them when the app is closed.
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && pending.current && repo.current?.pull) {
        repo.current.save(latest.current).then(() => { pending.current = false; }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, []);

  // Keep retrying a failed save until the server is reachable again.
  useEffect(() => {
    if (!saveError) return;
    const t = setInterval(() => {
      repo.current?.save(state).then(() => setSaveError(false)).catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [saveError, state]);

  // With a home server, pick up changes made on other devices (e.g. Mom's iPad
  // vs. her phone) when the app comes back to the foreground, and every 2 minutes.
  useEffect(() => {
    if (!ready || !repo.current?.pull) return;
    const sync = async () => {
      if (pending.current || document.visibilityState !== 'visible') return;
      const fresh = await repo.current?.pull?.().catch(() => null);
      if (fresh && !pending.current) {
        skipSave.current = true;
        dispatch({ type: 'replace', snapshot: fresh });
      }
    };
    const timer = setInterval(sync, 120000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', sync); window.removeEventListener('focus', sync); };
  }, [ready]);

  const value = useMemo<Store>(
    () => ({
      state,
      dispatch,
      ready,
      persistent,
      storageLabel,
      saveError,
      resetToSamples: () => dispatch({ type: 'replace', snapshot: seedSnapshot() }),
      newId: uid,
    }),
    [state, ready, persistent, storageLabel, saveError],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

export function useRecipe(id: string | undefined): Recipe | undefined {
  const { state } = useStore();
  return state.recipes.find((r) => r.id === id);
}
