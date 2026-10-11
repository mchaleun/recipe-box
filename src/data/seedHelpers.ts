// Builds seed recipes from plain string lists, giving every line a unique id.

import type { Recipe } from '../types';

let n = 0;
export const lines = (prefix: string, items: string[]) =>
  items.map((text) => {
    const heading = text.startsWith('## ');
    return { id: `${prefix}${++n}`, text: heading ? text.slice(3) : text, ...(heading ? { heading: true } : {}) };
  });

export type SeedRecipe = Omit<Recipe, 'ingredients' | 'steps' | 'favorite' | 'viewCount' | 'cookCount' | 'updatedAt'> &
  Partial<Pick<Recipe, 'favorite' | 'viewCount' | 'cookCount'>> & { ingredients: string[]; steps: string[] };

export function recipe(r: SeedRecipe): Recipe {
  return {
    favorite: false,
    viewCount: 0,
    cookCount: 0,
    ...r,
    updatedAt: r.createdAt,
    ingredients: lines('i', r.ingredients),
    steps: lines('s', r.steps),
  };
}

