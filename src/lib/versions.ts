// Versions of the same dish share a `family`. These helpers find a recipe's
// siblings and keep long lists to one card per dish.

import type { Recipe } from '../types';

/** The name shown for one version: its label, or the "(…)" part of its title. */
export function versionLabel(r: Recipe): string {
  return r.version || r.title.match(/\(([^)]+)\)\s*$/)?.[1] || r.title;
}

/** Every version of the recipe's dish, the main one first; just the recipe itself if it has none. */
export function versionsOf(recipes: Recipe[], r: Recipe): Recipe[] {
  if (!r.family) return [r];
  const family = recipes.filter((x) => x.family === r.family);
  return family.sort((a, b) => rank(b) - rank(a) || versionLabel(a).localeCompare(versionLabel(b)));
}

// The version she made or edited leads, then the one the family is named after.
function rank(r: Recipe): number {
  return (r.favorite ? 4 : 0) + (r.cookCount > 0 ? 2 : 0) + (r.id === r.family ? 1 : 0);
}

/** Keeps the first card of each dish in a list and counts its versions. */
export function oneCardPerDish(list: Recipe[], all: Recipe[]): { recipe: Recipe; versions: number }[] {
  const seen = new Set<string>();
  const out: { recipe: Recipe; versions: number }[] = [];
  for (const r of list) {
    if (!r.family) { out.push({ recipe: r, versions: 1 }); continue; }
    if (seen.has(r.family)) continue;
    seen.add(r.family);
    const family = versionsOf(all, r);
    const lead = family.find((x) => list.includes(x)) ?? r;
    out.push({ recipe: lead, versions: family.length });
  }
  return out;
}
