// Search that reads like a person typed it: "salmon", "chicken and rice",
// "Lao recipes", "under 30 minutes", "quick beef". Every meaningful word must
// match somewhere in the recipe; matches in the title rank highest.

import type { Category, Filters, Recipe, SortKey } from '../types';
import { totalMinutes } from './time';

const STOP_WORDS = new Set([
  'recipe', 'recipes', 'with', 'and', 'the', 'a', 'an', 'for', 'to', 'of', 'using',
  'made', 'dish', 'dishes', 'food', 'me', 'show', 'find', 'some', 'my', 'that', 'in',
  'any', 'or', 'something', 'meals', 'meal', 'ideas', 'easy-to-make', 'i', 'can', 'make',
]);

const SYNONYMS: Record<string, string[]> = {
  beef: ['steak', 'brisket', 'ground beef', 'chuck'],
  chicken: ['thigh', 'breast', 'drumstick'],
  pork: ['bacon', 'belly', 'ham', 'sausage'],
  seafood: ['fish', 'salmon', 'shrimp', 'tuna', 'cod', 'crab', 'scallop'],
  fish: ['salmon', 'tuna', 'cod', 'tilapia'],
  dessert: ['cake', 'cookie', 'mousse', 'fudge', 'pie'],
  bread: ['dough', 'loaf', 'bun', 'bagel'],
  grill: ['grilled', 'smoked', 'smoker', 'traeger', 'bbq'],
  bake: ['baked', 'oven', 'roast', 'roasted'],
};

export interface ParsedQuery {
  terms: string[];
  maxMinutes?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 4 && /(ches|shes|oes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function parseQuery(q: string): ParsedQuery {
  let text = normalize(q);
  let maxMinutes: number | undefined;

  const time = text.match(/(?:under|less than|within|in|max|<)\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/);
  if (time) {
    const n = parseFloat(time[1]);
    maxMinutes = time[2].startsWith('h') ? n * 60 : n;
    text = text.replace(time[0], ' ');
  }
  if (/\b(quick|fast)\b/.test(text)) {
    maxMinutes = maxMinutes ?? 30;
    text = text.replace(/\b(quick|fast)\b/g, ' ');
  }
  let difficulty: ParsedQuery['difficulty'];
  const diff = text.match(/\b(easy|simple|medium|hard|advanced)\b/);
  if (diff) {
    difficulty = diff[1] === 'hard' || diff[1] === 'advanced' ? 'Hard' : diff[1] === 'medium' ? 'Medium' : 'Easy';
    text = text.replace(diff[0], ' ');
  }

  const terms = text
    .split(/[^a-z0-9'’-]+/)
    .map((t) => t.replace(/['’]/g, ''))
    .filter((t) => t && !STOP_WORDS.has(t));
  return { terms, maxMinutes, difficulty };
}

interface Indexed {
  title: string;
  meta: string;
  tags: string;
  ingredients: string;
  body: string;
}

function index(r: Recipe, categories: Category[]): Indexed {
  const cats = r.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? '').join(' ');
  return {
    title: normalize(r.title),
    meta: normalize(`${cats} ${r.cuisine}`),
    tags: normalize(r.tags.join(' ')),
    ingredients: normalize(r.ingredients.map((i) => i.text).join(' \n ')),
    body: normalize(`${r.description} ${r.steps.map((s) => s.text).join(' ')} ${r.notes} ${r.source?.label ?? ''}`),
  };
}

function termScore(ix: Indexed, term: string): number {
  const variants = [term, stem(term), ...(SYNONYMS[stem(term)] ?? [])];
  let best = 0;
  for (const v of variants) {
    const synonym = v !== term && v !== stem(term);
    const w = synonym ? 0.5 : 1;
    const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    if (re.test(ix.title)) best = Math.max(best, 10 * w);
    else if (re.test(ix.meta)) best = Math.max(best, 7 * w);
    else if (re.test(ix.tags)) best = Math.max(best, 6 * w);
    else if (re.test(ix.ingredients)) best = Math.max(best, 4 * w);
    else if (re.test(ix.body)) best = Math.max(best, 1.5 * w);
  }
  return best;
}

export function applyFilters(recipes: Recipe[], f: Filters): Recipe[] {
  return recipes.filter((r) => {
    if (f.favoritesOnly && !r.favorite) return false;
    if (f.categoryIds.length && !f.categoryIds.some((id) => r.categoryIds.includes(id))) return false;
    if (f.cuisines.length && !f.cuisines.includes(r.cuisine)) return false;
    if (f.difficulty.length && (!r.difficulty || !f.difficulty.includes(r.difficulty))) return false;
    if (f.tags.length && !f.tags.every((t) => r.tags.includes(t))) return false;
    if (f.maxTotalMinutes) {
      const t = totalMinutes(r);
      if (!t || t > f.maxTotalMinutes) return false;
    }
    return true;
  });
}

export function searchRecipes(recipes: Recipe[], categories: Category[], query: string): Recipe[] {
  const q = parseQuery(query);
  if (!q.terms.length && !q.maxMinutes && !q.difficulty) return recipes;
  const scored: [Recipe, number][] = [];
  for (const r of recipes) {
    if (q.maxMinutes) {
      const t = totalMinutes(r);
      if (!t || t > q.maxMinutes) continue;
    }
    if (q.difficulty && r.difficulty !== q.difficulty) continue;
    const ix = index(r, categories);
    let total = 0;
    let ok = true;
    for (const term of q.terms) {
      const s = termScore(ix, term);
      if (!s) { ok = false; break; }
      total += s;
    }
    if (ok) scored.push([r, total + (r.favorite ? 0.5 : 0)]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([r]) => r);
}

export function sortRecipes(recipes: Recipe[], key: SortKey): Recipe[] {
  const list = [...recipes];
  switch (key) {
    case 'name': return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'time': return list.sort((a, b) => (totalMinutes(a) ?? 1e9) - (totalMinutes(b) ?? 1e9));
    case 'popular': return list.sort((a, b) => usage(b) - usage(a));
    case 'viewed': return list.sort((a, b) => (b.lastViewedAt ?? 0) - (a.lastViewedAt ?? 0));
    default: return list.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/** "Most frequently used": a cook counts for much more than a view. */
export function usage(r: Recipe): number {
  return r.cookCount * 3 + r.viewCount;
}

export const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Recently Added',
  name: 'Name',
  time: 'Total Time',
  popular: 'Most Used',
  viewed: 'Recently Viewed',
};
