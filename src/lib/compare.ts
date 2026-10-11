// Lines up the ingredients of two recipes so they can be read side by side:
// "1 cup sugar" next to "¾ cup brown sugar", then what only one of them uses.

import type { Ingredient } from '../types';

const UNITS = new Set(('cup cups c tbsp tablespoon tablespoons tbs tsp teaspoon teaspoons t oz ounce ounces lb lbs pound pounds g gram grams kg ml l liter liters ' +
  'pinch dash can cans package packages pkg stick sticks clove cloves large small medium whole quart quarts pint pints envelope envelopes slice slices piece pieces ' +
  'of and or to a an the for plus about optional divided taste room temperature softened melted chopped minced sliced diced fresh freshly ground packed sifted cold warm hot ' +
  'finely roughly lightly beaten cubed shredded grated peeled at into cut more needed extra').split(' '));

/** Content words of an ingredient line, singular, without amounts, units or prep notes. */
export function ingredientWords(text: string): string[] {
  const core = text.toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;]| - /)[0]
    .replace(/[\d½⅓⅔¼¾⅛⅜⅝⅞⅕./–-]+/g, ' ');
  return core.split(/[^a-zà-ÿ]+/)
    .filter((w) => w.length > 1 && !UNITS.has(w))
    .map((w) => (w.length > 3 && w.endsWith('es') && /(ches|shes|oes)$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

export interface IngredientRow { a?: Ingredient; b?: Ingredient }

/** How alike two ingredients are: 0 = different, higher = closer. */
function likeness(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const headA = a[a.length - 1], headB = b[b.length - 1];
  const overlap = a.filter((w) => b.includes(w)).length;
  if (headA === headB) return 10 + overlap * 2 - Math.abs(a.length - b.length);
  if (b.includes(headA) || a.includes(headB)) return 5 + overlap;
  return 0;
}

/** Pairs matching ingredients; returns [in both, only in A, only in B]. */
export function matchIngredients(a: Ingredient[], b: Ingredient[]): [IngredientRow[], IngredientRow[], IngredientRow[]] {
  const listA = a.filter((i) => !i.heading && i.text.trim());
  const listB = b.filter((i) => !i.heading && i.text.trim());
  const wordsA = listA.map((i) => ingredientWords(i.text));
  const wordsB = listB.map((i) => ingredientWords(i.text));
  // Best pairs first, so "brown sugar" finds "brown sugar" before plain "sugar" takes it.
  const pairs: [number, number, number][] = [];
  wordsA.forEach((wa, i) => wordsB.forEach((wb, j) => { const s = likeness(wa, wb); if (s > 0) pairs.push([s, i, j]); }));
  pairs.sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  const matchOf = new Map<number, number>();
  const usedB = new Set<number>();
  for (const [, i, j] of pairs) if (!matchOf.has(i) && !usedB.has(j)) { matchOf.set(i, j); usedB.add(j); }
  const both: IngredientRow[] = [];
  const onlyA: IngredientRow[] = [];
  listA.forEach((ing, i) => (matchOf.has(i) ? both.push({ a: ing, b: listB[matchOf.get(i)!] }) : onlyA.push({ a: ing })));
  const onlyB = listB.filter((_, j) => !usedB.has(j)).map((ing) => ({ b: ing }));
  return [both, onlyA, onlyB];
}
