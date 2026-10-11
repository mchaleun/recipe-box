import { useEffect, useState } from 'react';
import { useRecipe, useStore } from '../store';
import type { CookingProgress, Recipe } from '../types';
import { Icon } from '../components/Icon';
import { EmptyState, FavoriteButton, Menu, RecipeArt, Sheet, TopBar, useToast } from '../components/ui';
import { goBack, navigate } from '../router';
import { formatMinutes, relativeDay, totalMinutes } from '../lib/time';
import { scaleIngredient } from '../lib/quantity';
import { AddToCollectionSheet, CheckCircle } from './Collections';
import { searchFor } from './searchLink';

export function ServingsStepper({ value, base, unit, onChange, large }: { value: number; base: number; unit?: string; onChange: (n: number) => void; large?: boolean }) {
  const label = unit ?? 'servings';
  return (
    <div className={`stepper${large ? ' large' : ''}`} role="group" aria-label="Servings">
      <button onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Fewer servings"><Icon name="minus" size={18} stroke={2.2} /></button>
      <span className={`stepper-value${value !== base ? ' changed' : ''}`} aria-live="polite">
        <b>{value}</b> {value === 1 && label.endsWith('s') ? label.slice(0, -1) : label}
      </span>
      <button onClick={() => onChange(Math.min(99, value + 1))} aria-label="More servings"><Icon name="plus" size={18} stroke={2.2} /></button>
    </div>
  );
}

export function IngredientLine({ text, factor }: { text: string; factor: number }) {
  const s = scaleIngredient(text, factor);
  return (
    <span className="ing-text">
      {s.amount && <b className={s.scaled ? 'scaled' : undefined}>{s.amount}</b>}
      {s.amount ? s.rest.trimStart() : s.rest}
    </span>
  );
}

export function useProgress(recipe: Recipe | undefined) {
  const { state, dispatch } = useStore();
  const p = recipe ? state.progress[recipe.id] : undefined;
  const servings = p?.servings ?? recipe?.servings ?? 1;
  const set = (patch: Partial<CookingProgress>) => recipe && dispatch({ type: 'progress', id: recipe.id, progress: patch });
  const toggle = (kind: 'ingredients' | 'steps', id: string) => {
    const list = p?.[kind] ?? [];
    set({ [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };
  return {
    checkedIngredients: new Set(p?.ingredients ?? []),
    checkedSteps: new Set(p?.steps ?? []),
    servings,
    factor: recipe ? servings / (recipe.servings || 1) : 1,
    stepIndex: p?.stepIndex ?? 0,
    setServings: (n: number) => set({ servings: n }),
    setStepIndex: (n: number) => set({ stepIndex: n }),
    toggle,
    clearChecks: () => set({ ingredients: [], steps: [], stepIndex: 0 }),
    hasChecks: (p?.ingredients.length ?? 0) + (p?.steps.length ?? 0) > 0,
  };
}

export function RecipeView({ id }: { id: string }) {
  const recipe = useRecipe(id);
  const { state, dispatch, newId } = useStore();
  const toast = useToast();
  const progress = useProgress(recipe);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (recipe) dispatch({ type: 'viewed', id: recipe.id });
    window.scrollTo(0, 0);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!recipe) {
    return (
      <>
        <TopBar start={<button className="text-btn" onClick={() => goBack()}><Icon name="back" />Recipes</button>} />
        <div className="page"><EmptyState icon="book" title="Recipe Not Found">It may have been deleted.</EmptyState></div>
      </>
    );
  }

  const categories = recipe.categoryIds.map((cid) => state.categories.find((c) => c.id === cid)?.name).filter(Boolean);
  const total = totalMinutes(recipe);
  const ingredientCount = recipe.ingredients.filter((i) => !i.heading).length;
  const stepItems = recipe.steps.filter((s) => !s.heading);
  const doneSteps = stepItems.filter((s) => progress.checkedSteps.has(s.id)).length;
  const inCollections = state.collections.filter((c) => c.recipeIds.includes(recipe.id));

  const duplicate = () => {
    const copy: Recipe = {
      ...structuredClone(recipe), id: newId(), title: `${recipe.title} Copy`, favorite: false,
      createdAt: Date.now(), viewCount: 0, cookCount: 0, lastViewedAt: undefined, lastCookedAt: undefined,
    };
    dispatch({ type: 'upsertRecipe', recipe: copy });
    navigate({ name: 'edit', id: copy.id });
  };

  const remove = () => {
    const before = state;
    dispatch({ type: 'deleteRecipe', id: recipe.id });
    toast({ text: `Deleted “${recipe.title}”`, action: { label: 'Undo', run: () => dispatch({ type: 'replace', snapshot: before }) } });
    navigate({ name: 'library' }, { replace: true });
  };

  let stepNo = 0;

  return (
    <>
      <TopBar
        title={recipe.title}
        start={<button className="text-btn" onClick={() => goBack()}><Icon name="back" />Recipes</button>}
        end={
          <>
            <FavoriteButton recipe={recipe} className="icon-btn heart-btn" />
            <Menu items={[
              { label: 'Edit Recipe', icon: 'pencil', onSelect: () => navigate({ name: 'edit', id: recipe.id }) },
              { label: 'Add to Collection', icon: 'stack', onSelect: () => setCollectionOpen(true) },
              { label: 'Duplicate', icon: 'copy', onSelect: duplicate },
              ...(progress.hasChecks ? [{ label: 'Clear Checkmarks', icon: 'reset', onSelect: progress.clearChecks }] : []),
              { label: 'Delete Recipe', icon: 'trash', danger: true, divider: true, onSelect: () => setConfirmDelete(true) },
            ]} />
          </>
        }
      />

      <article className="page recipe page-enter">
        <header className="recipe-hero">
          <div className="recipe-photo"><RecipeArt recipe={recipe} /></div>
          <div className="recipe-intro">
            <div className="eyebrow">{[...categories, recipe.cuisine].filter(Boolean).join(' · ')}</div>
            <h1 className="recipe-title">{recipe.title}</h1>
            {recipe.description && <p className="recipe-desc">{recipe.description}</p>}
            <dl className="facts">
              <div><dt>Prep</dt><dd>{formatMinutes(recipe.prepMinutes)}</dd></div>
              <div><dt>Cook</dt><dd>{formatMinutes(recipe.cookMinutes)}</dd></div>
              <div><dt>Total</dt><dd>{formatMinutes(total)}</dd></div>
              <div><dt>{recipe.yieldUnit ? 'Makes' : 'Serves'}</dt><dd>{recipe.servings}{recipe.yieldUnit ? ` ${recipe.yieldUnit}` : ''}</dd></div>
              {recipe.difficulty && <div><dt>Difficulty</dt><dd>{recipe.difficulty}</dd></div>}
            </dl>
            <div className="hero-actions">
              <button className="btn primary lg" onClick={() => navigate({ name: 'cook', id: recipe.id })}>
                <Icon name="flame" size={20} /> {progress.hasChecks ? 'Resume Cooking' : 'Start Cooking'}
              </button>
              <button className="btn secondary lg" onClick={() => navigate({ name: 'edit', id: recipe.id })} aria-label="Edit recipe">
                <Icon name="pencil" size={20} /> <span className="hide-sm">Edit</span>
              </button>
            </div>
          </div>
        </header>

        <div className="recipe-body">
          <section className="ingredients" aria-labelledby="ing-h">
            <div className="block-head">
              <h2 id="ing-h" className="section-title">Ingredients</h2>
              <span className="footnote">{ingredientCount} items</span>
            </div>
            <div className="servings-row">
              <ServingsStepper value={progress.servings} base={recipe.servings} unit={recipe.yieldUnit} onChange={progress.setServings} />
              {progress.servings !== recipe.servings && (
                <button className="text-btn" onClick={() => progress.setServings(recipe.servings)}>Reset</button>
              )}
            </div>
            <ul className="checklist">
              {recipe.ingredients.map((ing) =>
                ing.heading ? (
                  <li key={ing.id} className="sub-head">{ing.text}</li>
                ) : (
                  <li key={ing.id}>
                    <button className={`ing${progress.checkedIngredients.has(ing.id) ? ' done' : ''}`} onClick={() => progress.toggle('ingredients', ing.id)} aria-pressed={progress.checkedIngredients.has(ing.id)}>
                      <CheckCircle on={progress.checkedIngredients.has(ing.id)} size={24} />
                      <IngredientLine text={ing.text} factor={progress.factor} />
                    </button>
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="steps" aria-labelledby="steps-h">
            <div className="block-head">
              <h2 id="steps-h" className="section-title">Steps</h2>
              {doneSteps > 0 && <span className="footnote">{doneSteps} of {stepItems.length} done</span>}
            </div>
            <ol className="step-list">
              {recipe.steps.map((s) => {
                if (s.heading) return <li key={s.id} className="sub-head">{s.text}</li>;
                stepNo += 1;
                const done = progress.checkedSteps.has(s.id);
                return (
                  <li key={s.id}>
                    <button className={`step${done ? ' done' : ''}`} onClick={() => progress.toggle('steps', s.id)} aria-pressed={done}>
                      <span className="step-no" aria-hidden="true">{done ? <Icon name="check" size={18} stroke={2.6} /> : stepNo}</span>
                      <span className="step-text"><span className="sr-only">Step {stepNo}. </span>{s.text}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {recipe.notes && (
              <aside className="notes">
                <h3>Notes</h3>
                <p>{recipe.notes}</p>
              </aside>
            )}

            <footer className="recipe-foot">
              {recipe.tags.length > 0 && (
                <div className="wrap-chips">
                  {recipe.tags.map((t) => <button key={t} className="chip soft" onClick={() => searchFor(t)}>#{t}</button>)}
                </div>
              )}
              {inCollections.length > 0 && (
                <p className="footnote">In {inCollections.map((c, i) => (
                  <span key={c.id}>{i > 0 && ', '}<a href={`#/collections/${c.id}`} onClick={(e) => { e.preventDefault(); navigate({ name: 'collection', id: c.id }); }}>{c.name}</a></span>
                ))}</p>
              )}
              {recipe.source && (
                <p className="footnote">
                  Source: {recipe.source.url ? <a href={recipe.source.url} target="_blank" rel="noreferrer">{recipe.source.label}</a> : recipe.source.label}
                  {recipe.source.file && <> · from <i>{recipe.source.file}</i></>}
                </p>
              )}
              <p className="footnote">
                Added {relativeDay(recipe.createdAt)}
                {recipe.cookCount > 0 && <> · Cooked {recipe.cookCount} {recipe.cookCount === 1 ? 'time' : 'times'}</>}
                {recipe.updatedAt > recipe.createdAt + 1000 && <> · Edited {relativeDay(recipe.updatedAt)}</>}
              </p>
            </footer>
          </section>
        </div>
      </article>

      <AddToCollectionSheet open={collectionOpen} onClose={() => setCollectionOpen(false)} recipe={recipe} />
      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete “${recipe.title}”?`} footer={
        <>
          <button className="btn secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
          <button className="btn primary" style={{ background: 'var(--danger)', color: '#fff' }} onClick={remove}>Delete</button>
        </>
      }>
        <p className="secondary">This removes the recipe from your library and every collection.</p>
      </Sheet>
    </>
  );
}
