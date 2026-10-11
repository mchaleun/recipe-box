import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { emptyFilters, type Filters, type Recipe, type SortKey } from '../types';
import { applyFilters, searchRecipes, sortRecipes, SORT_LABELS, usage } from '../lib/search';
import { Icon } from '../components/Icon';
import { EmptyState, Link, Menu, RecipeCard, Sheet } from '../components/ui';
import { AlbumTile } from './Collections';
import { navigate } from '../router';
import { takePendingSearch } from './searchLink';

// Library UI state survives navigating into a recipe and back.
const memory: { query: string; category: string; filters: Filters; sort: SortKey } = {
  query: '', category: '', filters: emptyFilters, sort: 'recent',
};

const HINTS = ['under 30 minutes', 'pumpkin', 'sourdough', 'chocolate', 'cookies'];

export function countFilters(f: Filters): number {
  return f.categoryIds.length + f.cuisines.length + f.difficulty.length + f.tags.length + (f.favoritesOnly ? 1 : 0) + (f.maxTotalMinutes ? 1 : 0);
}

export function Library() {
  const { state } = useStore();
  const [query, setQueryState] = useState(() => {
    const pending = takePendingSearch();
    if (pending !== null) Object.assign(memory, { query: pending, category: '', filters: emptyFilters });
    return memory.query;
  });
  const [category, setCategoryState] = useState(memory.category);
  const [filters, setFiltersState] = useState(memory.filters);
  const [sort, setSortState] = useState<SortKey>(memory.sort);
  const [filterOpen, setFilterOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const setQuery = (v: string) => { memory.query = v; setQueryState(v); };
  const setCategory = (v: string) => { memory.category = v; setCategoryState(v); };
  const setFilters = (v: Filters) => { memory.filters = v; setFiltersState(v); };
  const setSort = (v: SortKey) => { memory.sort = v; setSortState(v); };

  const recipes = state.recipes;
  const filterCount = countFilters(filters);
  const browsing = !query.trim() && !category && filterCount === 0;

  const results = useMemo(() => {
    let list = applyFilters(recipes, category ? { ...filters, categoryIds: [category] } : filters);
    if (query.trim()) {
      list = searchRecipes(list, state.categories, query);
      return sort === 'recent' ? list : sortRecipes(list, sort); // relevance order by default while searching
    }
    return sortRecipes(list, sort);
  }, [recipes, state.categories, query, category, filters, sort]);

  const usedCategories = state.categories.filter((c) => recipes.some((r) => r.categoryIds.includes(c.id)));
  const recentlyViewed = sortRecipes(recipes.filter((r) => r.lastViewedAt), 'viewed').slice(0, 10);
  const favorites = recipes.filter((r) => r.favorite);
  const recentlyAdded = sortRecipes(recipes, 'recent').slice(0, 10);
  const mostUsed = [...recipes].filter((r) => usage(r) > 0).sort((a, b) => usage(b) - usage(a)).slice(0, 10);

  return (
    <div className="page page-enter">
      <div className="library-head">
        <div>
          <h1 className="large-title">Recipes</h1>
          <div className="count">{recipes.length} recipes · {state.collections.length} collections</div>
        </div>
      </div>

      <div className="search" role="search">
        <span className="search-icon"><Icon name="search" size={20} /></span>
        <input
          ref={inputRef}
          id="library-search"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search recipes, ingredients, cuisines"
          aria-label="Search recipes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); inputRef.current?.blur(); } }}
        />
        {query && (
          <button className="clear" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M9 9l6 6M15 9l-6 6" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>
      {focused && !query && (
        <div className="search-hints" aria-label="Try searching for">
          {HINTS.map((h) => (
            <button key={h} className="chip soft" onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery(h)}>{h}</button>
          ))}
        </div>
      )}

      <div className="chips" role="tablist" aria-label="Categories">
        <button role="tab" aria-selected={!category} className={`chip${!category ? ' on' : ''}`} onClick={() => setCategory('')}>All</button>
        {usedCategories.map((c) => (
          <button key={c.id} role="tab" aria-selected={category === c.id} className={`chip${category === c.id ? ' on' : ''}`} onClick={() => setCategory(category === c.id ? '' : c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {browsing ? (
        <>
          {recentlyViewed.length > 0 && <Shelf title="Recently Viewed" recipes={recentlyViewed} />}
          {favorites.length > 0 && <Shelf title="Favorites" recipes={favorites} seeAll={() => navigate({ name: 'favorites' })} />}
          {state.collections.length > 0 && (
            <section className="shelf">
              <div className="shelf-head">
                <h2 className="section-title">Collections</h2>
                <Link to={{ name: 'collections' }} className="see-all">See All</Link>
              </div>
              <div className="carousel small">
                {state.collections.map((c) => <AlbumTile key={c.id} collection={c} />)}
              </div>
            </section>
          )}
          {mostUsed.length > 0 && <Shelf title="Most Used" recipes={mostUsed} />}
          <Shelf title="Recently Added" recipes={recentlyAdded} />
          <section className="shelf">
            <div className="shelf-head">
              <h2 className="section-title">All Recipes</h2>
            </div>
            <Toolbar count={results.length} sort={sort} setSort={setSort} filterCount={filterCount} openFilters={() => setFilterOpen(true)} />
            <div className="grid" style={{ marginTop: 12 }}>
              {results.map((r) => <RecipeCard key={r.id} recipe={r} />)}
            </div>
          </section>
        </>
      ) : (
        <section>
          <Toolbar count={results.length} sort={sort} setSort={setSort} filterCount={filterCount} openFilters={() => setFilterOpen(true)} searching={!!query.trim()} />
          {filterCount > 0 && <ActiveFilters filters={filters} setFilters={setFilters} />}
          {results.length ? (
            <div className="grid" style={{ marginTop: 12 }}>
              {results.map((r) => <RecipeCard key={r.id} recipe={r} />)}
            </div>
          ) : (
            <EmptyState icon="search" title="No Results" action={
              <button className="btn secondary" onClick={() => { setQuery(''); setCategory(''); setFilters(emptyFilters); }}>Clear Search and Filters</button>
            }>
              {query.trim() ? <>Nothing matches “{query.trim()}”. Try an ingredient, a cuisine, or fewer words.</> : 'No recipes match these filters.'}
            </EmptyState>
          )}
        </section>
      )}

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} setFilters={setFilters} recipes={recipes} />
    </div>
  );
}

function Shelf({ title, recipes, seeAll }: { title: string; recipes: Recipe[]; seeAll?: () => void }) {
  return (
    <section className="shelf">
      <div className="shelf-head">
        <h2 className="section-title">{title}</h2>
        {seeAll && <button className="see-all" onClick={seeAll}>See All</button>}
      </div>
      <div className="carousel">
        {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
      </div>
    </section>
  );
}

function Toolbar({ count, sort, setSort, filterCount, openFilters, searching }: {
  count: number; sort: SortKey; setSort: (s: SortKey) => void; filterCount: number; openFilters: () => void; searching?: boolean;
}) {
  const sortLabel = searching && sort === 'recent' ? 'Best Match' : SORT_LABELS[sort];
  return (
    <div className="toolbar">
      <div className="result-count">{count} {count === 1 ? 'recipe' : 'recipes'}</div>
      <div className="toolbar-actions">
        <Menu
          label={`Sort by ${sortLabel}`}
          icon="sort"
          heading="Sort By"
          items={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({
            label: searching && k === 'recent' ? 'Best Match' : SORT_LABELS[k],
            checked: sort === k,
            onSelect: () => setSort(k),
          }))}
        />
        <button className="pill-btn" onClick={openFilters} aria-label={`Filters${filterCount ? `, ${filterCount} active` : ''}`}>
          <Icon name="sliders" size={20} />
          Filter
          {filterCount > 0 && <span className="badge">{filterCount}</span>}
        </button>
      </div>
    </div>
  );
}

function ActiveFilters({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  const { state } = useStore();
  const chips: { label: string; remove: () => void }[] = [];
  if (filters.favoritesOnly) chips.push({ label: 'Favorites', remove: () => setFilters({ ...filters, favoritesOnly: false }) });
  if (filters.maxTotalMinutes) chips.push({ label: `Under ${filters.maxTotalMinutes >= 60 ? `${filters.maxTotalMinutes / 60} hr` : `${filters.maxTotalMinutes} min`}`, remove: () => setFilters({ ...filters, maxTotalMinutes: undefined }) });
  filters.categoryIds.forEach((id) => chips.push({ label: state.categories.find((c) => c.id === id)?.name ?? id, remove: () => setFilters({ ...filters, categoryIds: filters.categoryIds.filter((x) => x !== id) }) }));
  filters.cuisines.forEach((c) => chips.push({ label: c, remove: () => setFilters({ ...filters, cuisines: filters.cuisines.filter((x) => x !== c) }) }));
  filters.difficulty.forEach((d) => chips.push({ label: d, remove: () => setFilters({ ...filters, difficulty: filters.difficulty.filter((x) => x !== d) }) }));
  filters.tags.forEach((t) => chips.push({ label: `#${t}`, remove: () => setFilters({ ...filters, tags: filters.tags.filter((x) => x !== t) }) }));
  return (
    <div className="wrap-chips" style={{ marginTop: 4 }}>
      {chips.map((c) => (
        <button key={c.label} className="chip soft" onClick={c.remove} aria-label={`Remove filter ${c.label}`}>
          {c.label} <span className="x"><Icon name="close" size={14} stroke={2.2} /></span>
        </button>
      ))}
    </div>
  );
}

const TIME_OPTIONS = [15, 30, 60, 120];

export function FilterSheet({ open, onClose, filters, setFilters, recipes }: {
  open: boolean; onClose: () => void; filters: Filters; setFilters: (f: Filters) => void; recipes: Recipe[];
}) {
  const { state } = useStore();
  const toggle = <K extends 'categoryIds' | 'cuisines' | 'difficulty' | 'tags'>(key: K, v: Filters[K][number]) => {
    const list = filters[key] as string[];
    setFilters({ ...filters, [key]: list.includes(v as string) ? list.filter((x) => x !== v) : [...list, v] });
  };
  const cuisines = [...new Set(recipes.map((r) => r.cuisine).filter(Boolean))].sort();
  const tagCounts = new Map<string, number>();
  recipes.forEach((r) => r.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)));
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([t]) => t);
  const count = applyFilters(recipes, filters).length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter"
      footer={
        <>
          <button className="btn secondary" onClick={() => setFilters(emptyFilters)} disabled={!countFilters(filters)}>Reset</button>
          <button className="btn primary" onClick={onClose}>Show {count} {count === 1 ? 'Recipe' : 'Recipes'}</button>
        </>
      }
    >
      <div className="filter-group">
        <div className="wrap-chips">
          <button className={`chip${filters.favoritesOnly ? ' on' : ''}`} onClick={() => setFilters({ ...filters, favoritesOnly: !filters.favoritesOnly })}>
            <Icon name="heart" size={16} filled={filters.favoritesOnly} /> Favorites Only
          </button>
        </div>
      </div>
      <div className="filter-group">
        <div className="filter-label">Total Time</div>
        <div className="wrap-chips">
          <button className={`chip${!filters.maxTotalMinutes ? ' on' : ''}`} onClick={() => setFilters({ ...filters, maxTotalMinutes: undefined })}>Any</button>
          {TIME_OPTIONS.map((m) => (
            <button key={m} className={`chip${filters.maxTotalMinutes === m ? ' on' : ''}`} onClick={() => setFilters({ ...filters, maxTotalMinutes: m })}>
              Under {m >= 60 ? `${m / 60} hr` : `${m} min`}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <div className="filter-label">Category</div>
        <div className="wrap-chips">
          {state.categories.map((c) => (
            <button key={c.id} className={`chip${filters.categoryIds.includes(c.id) ? ' on' : ''}`} onClick={() => toggle('categoryIds', c.id)}>{c.name}</button>
          ))}
        </div>
      </div>
      {cuisines.length > 0 && (
        <div className="filter-group">
          <div className="filter-label">Cuisine</div>
          <div className="wrap-chips">
            {cuisines.map((c) => (
              <button key={c} className={`chip${filters.cuisines.includes(c) ? ' on' : ''}`} onClick={() => toggle('cuisines', c)}>{c}</button>
            ))}
          </div>
        </div>
      )}
      <div className="filter-group">
        <div className="filter-label">Difficulty</div>
        <div className="wrap-chips">
          {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
            <button key={d} className={`chip${filters.difficulty.includes(d) ? ' on' : ''}`} onClick={() => toggle('difficulty', d)}>{d}</button>
          ))}
        </div>
      </div>
      {tags.length > 0 && (
        <div className="filter-group">
          <div className="filter-label">Tags</div>
          <div className="wrap-chips">
            {tags.map((t) => (
              <button key={t} className={`chip soft${filters.tags.includes(t) ? ' on' : ''}`} onClick={() => toggle('tags', t)}>#{t}</button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
