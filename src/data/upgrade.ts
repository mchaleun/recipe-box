import type { LibrarySnapshot, Recipe } from '../types';
import { RETIRED_EXAMPLES, SEED_VERSION, seedSnapshot } from './seed';

/** Merges newly imported starter recipes into a library saved by an older
 *  version, without touching anything the person added or edited. */
export function upgradeSeed(saved: LibrarySnapshot): LibrarySnapshot {
  if ((saved.seedVersion ?? 1) >= SEED_VERSION) return saved;
  const fresh = seedSnapshot();
  const retired = new Set(
    saved.recipes.filter((r) => RETIRED_EXAMPLES.includes(r.id) && r.updatedAt <= r.createdAt + 1000).map((r) => r.id),
  );
  // Recipes imported before versions existed join their dish's family. Untouched
  // ones also pick up the new title and notes; edited ones keep their wording.
  const freshById = new Map(fresh.recipes.map((r) => [r.id, r]));
  const joinFamily = (r: Recipe): Recipe => {
    const f = freshById.get(r.id);
    if (!f?.family || r.family) return r;
    if (r.updatedAt > r.createdAt + 1000) return { ...r, family: f.family, version: f.version };
    const { favorite, viewCount, cookCount, lastViewedAt, lastCookedAt, photo } = r;
    return { ...f, favorite, viewCount, cookCount, lastViewedAt, lastCookedAt, photo };
  };
  const have = new Set(saved.recipes.map((r) => r.id));
  const haveCats = new Set(saved.categories.map((c) => c.id));
  const haveCols = new Set(saved.collections.map((c) => c.id));
  return {
    ...saved,
    seedVersion: SEED_VERSION,
    recipes: [...saved.recipes.filter((r) => !retired.has(r.id)).map(joinFamily), ...fresh.recipes.filter((r) => !have.has(r.id))],
    categories: [...saved.categories, ...fresh.categories.filter((c) => !haveCats.has(c.id))],
    collections: [
      ...saved.collections
        .map((c) => ({ ...c, recipeIds: c.recipeIds.filter((id) => !retired.has(id)) }))
        .filter((c) => !(['lao-recipes', 'weeknight-meals'].includes(c.id) && c.recipeIds.length === 0)),
      ...fresh.collections.filter((c) => !haveCols.has(c.id)),
    ],
  };
}
