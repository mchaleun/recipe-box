import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Collection, Recipe } from '../types';
import { Icon } from '../components/Icon';
import { EmptyState, Link, Menu, RecipeArt, RecipeCard, RowCard, Sheet, TopBar, useToast } from '../components/ui';
import { goBack, navigate } from '../router';
import { searchRecipes, sortRecipes } from '../lib/search';

export function AlbumCover({ recipes }: { recipes: Recipe[] }) {
  const shown = recipes.slice(0, 4);
  if (!shown.length) return <div className="album-cover single album-empty"><Icon name="stack" size={36} /></div>;
  if (shown.length < 4) return <div className="album-cover single"><RecipeArt recipe={shown[0]} /></div>;
  return <div className="album-cover">{shown.map((r) => <RecipeArt key={r.id} recipe={r} />)}</div>;
}

export function AlbumTile({ collection }: { collection: Collection }) {
  const { state } = useStore();
  const recipes = collection.recipeIds.map((id) => state.recipes.find((r) => r.id === id)).filter(Boolean) as Recipe[];
  return (
    <Link to={{ name: 'collection', id: collection.id }} className="album">
      <AlbumCover recipes={recipes} />
      <div className="album-name">{collection.name}</div>
      <div className="album-count">{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</div>
    </Link>
  );
}

export function NameSheet({ open, onClose, title, initial = '', confirm, onSubmit }: {
  open: boolean; onClose: () => void; title: string; initial?: string; confirm: string; onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) { setLastOpen(open); if (open) setName(initial); }
  const submit = () => { if (name.trim()) { onSubmit(name.trim()); onClose(); } };
  return (
    <Sheet open={open} onClose={onClose} title={title} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>{confirm}</button>
      </>
    }>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="list">
          <div className="list-row">
            <input id="name-sheet-input" className="inline" autoFocus placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
          </div>
        </div>
      </form>
    </Sheet>
  );
}

export function Collections() {
  const { state, dispatch, newId } = useStore();
  const [creating, setCreating] = useState(false);
  return (
    <div className="page page-enter">
      <div className="library-head">
        <div>
          <h1 className="large-title">Collections</h1>
          <div className="count">Group recipes the way you cook: weeknights, holidays, a cuisine.</div>
        </div>
      </div>
      <div className="grid" style={{ marginTop: 28 }}>
        <button className="album album-new" onClick={() => setCreating(true)} style={{ textAlign: 'left' }}>
          <div className="album-cover"><Icon name="plus" size={40} stroke={1.6} /></div>
          <div className="album-name" style={{ color: 'var(--accent-text)' }}>New Collection</div>
          <div className="album-count">&nbsp;</div>
        </button>
        {state.collections.map((c) => <AlbumTile key={c.id} collection={c} />)}
      </div>
      <NameSheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New Collection"
        confirm="Create"
        onSubmit={(name) => {
          const id = newId();
          dispatch({ type: 'upsertCollection', collection: { id, name, recipeIds: [], createdAt: Date.now() } });
          navigate({ name: 'collection', id });
        }}
      />
    </div>
  );
}

export function CollectionDetail({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const collection = state.collections.find((c) => c.id === id);
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!collection) {
    return (
      <>
        <TopBar start={<button className="text-btn" onClick={() => goBack({ name: 'collections' })}><Icon name="back" />Collections</button>} />
        <div className="page"><EmptyState icon="stack" title="Collection Not Found">It may have been deleted.</EmptyState></div>
      </>
    );
  }
  const recipes = collection.recipeIds.map((rid) => state.recipes.find((r) => r.id === rid)).filter(Boolean) as Recipe[];

  return (
    <>
      <TopBar
        title={collection.name}
        start={<button className="text-btn" onClick={() => goBack({ name: 'collections' })}><Icon name="back" />Collections</button>}
        end={
          <>
            <button className="icon-btn" aria-label="Add recipes" onClick={() => setAdding(true)}><Icon name="plus" /></button>
            <Menu items={[
              { label: 'Add Recipes', icon: 'plus', onSelect: () => setAdding(true) },
              { label: 'Rename', icon: 'pencil', onSelect: () => setRenaming(true) },
              { label: 'Delete Collection', icon: 'trash', danger: true, divider: true, onSelect: () => setConfirmDelete(true) },
            ]} />
          </>
        }
      />
      <div className="page page-enter">
        <div className="library-head" style={{ alignItems: 'center', justifyContent: 'flex-start', gap: 20 }}>
          <div style={{ width: 'min(28vw, 120px)', flex: 'none' }}><AlbumCover recipes={recipes} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Collection</div>
            <h1 className="large-title" style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}>{collection.name}</h1>
            <div className="count">{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</div>
          </div>
        </div>
        {recipes.length ? (
          <div className="grid" style={{ marginTop: 32 }}>
            {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
          </div>
        ) : (
          <EmptyState icon="stack" title="No Recipes Yet" action={<button className="btn primary" onClick={() => setAdding(true)}>Add Recipes</button>}>
            Add recipes from your library, or use “Add to Collection” on any recipe.
          </EmptyState>
        )}
      </div>

      <NameSheet open={renaming} onClose={() => setRenaming(false)} title="Rename Collection" initial={collection.name} confirm="Save"
        onSubmit={(name) => dispatch({ type: 'upsertCollection', collection: { ...collection, name } })} />
      <PickRecipesSheet open={adding} onClose={() => setAdding(false)} collection={collection} />
      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete “${collection.name}”?`} footer={
        <>
          <button className="btn secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
          <button className="btn primary" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => {
            dispatch({ type: 'deleteCollection', id: collection.id });
            toast({ text: 'Collection deleted', action: { label: 'Undo', run: () => dispatch({ type: 'upsertCollection', collection }) } });
            navigate({ name: 'collections' }, { replace: true });
          }}>Delete</button>
        </>
      }>
        <p className="secondary">The recipes stay in your library. Only the collection is removed.</p>
      </Sheet>
    </>
  );
}

function PickRecipesSheet({ open, onClose, collection }: { open: boolean; onClose: () => void; collection: Collection }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const list = useMemo(() => (q.trim() ? searchRecipes(state.recipes, state.categories, q) : sortRecipes(state.recipes, 'name')), [q, state.recipes, state.categories]);
  return (
    <Sheet open={open} onClose={onClose} title="Add Recipes" headEnd={<button className="text-btn strong" onClick={onClose}>Done</button>}>
      <div className="search" style={{ marginTop: 0, position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-elevated)', paddingBottom: 8 }}>
        <span className="search-icon" style={{ top: 24 }}><Icon name="search" size={20} /></span>
        <input id="pick-search" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search recipes" />
      </div>
      {list.map((r) => {
        const on = collection.recipeIds.includes(r.id);
        return (
          <button key={r.id} className="check-row" onClick={() => dispatch({ type: 'toggleInCollection', collectionId: collection.id, recipeId: r.id })} aria-pressed={on}>
            <div style={{ flex: 1, minWidth: 0 }}><RowCard recipe={r} /></div>
            <CheckCircle on={on} />
          </button>
        );
      })}
    </Sheet>
  );
}

export function CheckCircle({ on, size = 26 }: { on: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center',
        border: on ? 'none' : '1.5px solid var(--text-3)', background: on ? 'var(--accent)' : 'transparent', color: 'var(--on-accent)',
        transition: 'background .2s, border-color .2s',
      }}
    >
      {on && <Icon name="check" size={size * 0.62} stroke={2.6} />}
    </span>
  );
}

export function AddToCollectionSheet({ open, onClose, recipe }: { open: boolean; onClose: () => void; recipe: Recipe }) {
  const { state, dispatch, newId } = useStore();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <Sheet open={open && !creating} onClose={onClose} title="Add to Collection" headEnd={<button className="text-btn strong" onClick={onClose}>Done</button>}>
        <button className="check-row" onClick={() => setCreating(true)} style={{ color: 'var(--accent-text)' }}>
          <span style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--fill)', display: 'grid', placeItems: 'center' }}><Icon name="plus" /></span>
          <span style={{ fontWeight: 600 }}>New Collection</span>
        </button>
        {state.collections.map((c) => {
          const on = c.recipeIds.includes(recipe.id);
          const recipes = c.recipeIds.map((id) => state.recipes.find((r) => r.id === id)).filter(Boolean) as Recipe[];
          return (
            <button key={c.id} className="check-row" onClick={() => dispatch({ type: 'toggleInCollection', collectionId: c.id, recipeId: recipe.id })} aria-pressed={on}>
              <span style={{ width: 56, flex: 'none' }}><AlbumCover recipes={recipes} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{c.name}</span>
                <span className="footnote">{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</span>
              </span>
              <CheckCircle on={on} />
            </button>
          );
        })}
      </Sheet>
      <NameSheet open={creating} onClose={() => setCreating(false)} title="New Collection" confirm="Create"
        onSubmit={(name) => dispatch({ type: 'upsertCollection', collection: { id: newId(), name, recipeIds: [recipe.id], createdAt: Date.now() } })} />
    </>
  );
}

export function Favorites() {
  const { state } = useStore();
  const favorites = sortRecipes(state.recipes.filter((r) => r.favorite), 'name');
  return (
    <div className="page page-enter">
      <div className="library-head">
        <div>
          <h1 className="large-title">Favorites</h1>
          <div className="count">{favorites.length} {favorites.length === 1 ? 'recipe' : 'recipes'}</div>
        </div>
      </div>
      {favorites.length ? (
        <div className="grid" style={{ marginTop: 28 }}>
          {favorites.map((r) => <RecipeCard key={r.id} recipe={r} />)}
        </div>
      ) : (
        <EmptyState icon="heart" title="No Favorites Yet">Tap the heart on any recipe to keep it here.</EmptyState>
      )}
    </div>
  );
}
