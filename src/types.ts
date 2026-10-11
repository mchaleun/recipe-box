// Core data model. Everything the app shows is derived from a LibrarySnapshot,
// which the storage layer (src/data/repository.ts) loads and saves as a whole.

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/** One ingredient line, kept as written ("1 ½ cups flour, sifted").
 *  Quantities are parsed from the text at display time, so imported recipes
 *  keep their original wording and still scale. */
export interface Ingredient {
  id: string;
  text: string;
  /** A section label such as "For the sauce" rather than an ingredient. */
  heading?: boolean;
}

export interface Step {
  id: string;
  text: string;
  heading?: boolean;
}

export interface RecipeSource {
  label: string;
  url?: string;
  /** Original file the recipe was imported from, e.g. "Hot Fudge.xlsx". */
  file?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  /** data: URL or remote URL. Empty means the generated artwork is shown. */
  photo?: string;
  categoryIds: string[];
  cuisine: string;
  tags: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  /** Set only when total differs from prep + cook (resting, chilling, proofing). */
  totalMinutes?: number;
  servings: number;
  /** What a "serving" is called, e.g. "servings", "cookies", "pizzas". */
  yieldUnit?: string;
  difficulty?: Difficulty;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  source?: RecipeSource;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastViewedAt?: number;
  viewCount: number;
  cookCount: number;
  lastCookedAt?: number;
}

export interface Category {
  id: string;
  name: string;
  /** Hue (0–360) used for generated artwork when a recipe has no photo. */
  hue: number;
}

export interface Collection {
  id: string;
  name: string;
  recipeIds: string[];
  createdAt: number;
}

/** Checked-off ingredients and steps, kept per recipe so progress survives a reload. */
export interface CookingProgress {
  ingredients: string[];
  steps: string[];
  servings?: number;
  stepIndex?: number;
  updatedAt: number;
}

export interface LibrarySnapshot {
  version: 1;
  /** Which starter library this browser has merged in (see data/seed.ts). */
  seedVersion?: number;
  recipes: Recipe[];
  categories: Category[];
  collections: Collection[];
  progress: Record<string, CookingProgress>;
}

export type SortKey = 'recent' | 'name' | 'time' | 'popular' | 'viewed';

export interface Filters {
  categoryIds: string[];
  cuisines: string[];
  difficulty: Difficulty[];
  maxTotalMinutes?: number;
  favoritesOnly: boolean;
  tags: string[];
}

export const emptyFilters: Filters = {
  categoryIds: [],
  cuisines: [],
  difficulty: [],
  favoritesOnly: false,
  tags: [],
};
