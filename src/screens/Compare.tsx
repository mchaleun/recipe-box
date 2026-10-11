import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Recipe } from '../types';
import { Icon } from '../components/Icon';
import { Link, RecipeArt, RowCard, Sheet, TopBar } from '../components/ui';
import { goBack, navigate } from '../router';
import { formatMinutes, totalMinutes } from '../lib/time';
import { scaleIngredient } from '../lib/quantity';
import { searchRecipes, sortRecipes } from '../lib/search';
import { matchIngredients, type IngredientRow } from '../lib/compare';

/** Picks the recipe to compare with (or to swap one side for). */
export function ComparePicker({ open, onClose, exclude, onPick, title = 'Compare With…' }: {
  open: boolean; onClose: () => void; exclude: string[]; onPick: (id: string) => void; title?: string;
}) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const pool = state.recipes.filter((r) => !exclude.includes(r.id));
    return q.trim() ? searchRecipes(pool, state.categories, q) : sortRecipes(pool, 'name');
  }, [q, state.recipes, state.categories, exclude]);
  return (
    <Sheet open={open} onClose={onClose} title={title} headEnd={<button className="text-btn" onClick={onClose}>Cancel</button>}>
      <div className="search" style={{ marginTop: 0, position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-elevated)', paddingBottom: 8 }}>
        <span className="search-icon" style={{ top: 24 }}><Icon name="search" size={20} /></span>
        <input id="compare-search" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search recipes" />
      </div>
      {list.map((r) => (
        <button key={r.id} className="check-row" onClick={() => { onPick(r.id); setQ(''); }}>
          <div style={{ flex: 1, minWidth: 0 }}><RowCard recipe={r} /></div>
          <Icon name="forward" size={18} className="tertiary" />
        </button>
      ))}
    </Sheet>
  );
}

function Line({ text }: { text?: string }) {
  if (!text) return <span className="cmp-none" aria-label="Not used">—</span>;
  const { amount, rest } = scaleIngredient(text, 1);
  return <span>{amount && <strong>{amount}</strong>}{amount ? ' ' : ''}{rest.trim()}</span>;
}

function IngredientGroup({ title, rows, note }: { title: string; rows: IngredientRow[]; note?: string }) {
  if (!rows.length) return null;
  return (
    <section className="cmp-group">
      <h3 className="cmp-group-title">{title} <span className="cmp-count">{rows.length}</span></h3>
      {note && <p className="footnote secondary" style={{ marginBottom: 6 }}>{note}</p>}
      {rows.map((row, i) => (
        <div className={`cmp-row${row.a && row.b ? '' : ' single'}`} key={i}>
          <div className="cmp-cell"><Line text={row.a?.text} /></div>
          <div className="cmp-cell"><Line text={row.b?.text} /></div>
        </div>
      ))}
    </section>
  );
}

function fact(r: Recipe, key: string): string {
  switch (key) {
    case 'Prep': return formatMinutes(r.prepMinutes);
    case 'Cook': return formatMinutes(r.cookMinutes);
    case 'Total': return formatMinutes(totalMinutes(r));
    case 'Makes': return `${r.servings}${r.yieldUnit ? ` ${r.yieldUnit}` : ' servings'}`;
    case 'Difficulty': return r.difficulty ? r.difficulty[0].toUpperCase() + r.difficulty.slice(1) : '—';
    case 'Ingredients': return String(r.ingredients.filter((i) => !i.heading && i.text.trim()).length);
    case 'Steps': return String(r.steps.filter((s) => !s.heading && s.text.trim()).length);
    default: return '';
  }
}

export function Compare({ a, b }: { a: string; b: string }) {
  const { state } = useStore();
  const [swapSide, setSwapSide] = useState<'a' | 'b' | null>(null);
  const ra = state.recipes.find((r) => r.id === a);
  const rb = state.recipes.find((r) => r.id === b);
  const groups = useMemo(() => (ra && rb ? matchIngredients(ra.ingredients, rb.ingredients) : null), [ra, rb]);

  if (!ra || !rb || !groups) {
    return (
      <>
        <TopBar title="Compare" start={<button className="text-btn" onClick={() => goBack()}><Icon name="back" />Back</button>} />
        <div className="page"><p className="secondary" style={{ paddingTop: 40, textAlign: 'center' }}>One of these recipes was deleted.</p></div>
      </>
    );
  }
  const [both, onlyA, onlyB] = groups;
  const replace = (id: string) => {
    navigate({ name: 'compare', a: swapSide === 'a' ? id : a, b: swapSide === 'b' ? id : b }, { replace: true });
    setSwapSide(null);
  };
  const short = (r: Recipe) => (r.title.length > 22 ? `${r.title.slice(0, 21)}…` : r.title);

  return (
    <>
      <TopBar
        title="Compare"
        start={<button className="text-btn" onClick={() => goBack({ name: 'recipe', id: a })}><Icon name="back" />Back</button>}
        end={<button className="icon-btn" aria-label="Swap sides" onClick={() => navigate({ name: 'compare', a: b, b: a }, { replace: true })}><Icon name="sort" /></button>}
      />
      <div className="page compare page-enter">
        <h1 className="large-title cmp-heading">Compare</h1>

        <div className="cmp-heads">
          {[ra, rb].map((r, i) => (
            <div className="cmp-head" key={r.id}>
              <Link to={{ name: 'recipe', id: r.id }} className="cmp-head-link" ariaLabel={`Open ${r.title}`}>
                <div className="cmp-art"><RecipeArt recipe={r} /></div>
                <h2>{r.title}</h2>
              </Link>
              <button className="text-btn cmp-change" onClick={() => setSwapSide(i === 0 ? 'a' : 'b')}>Change</button>
            </div>
          ))}
        </div>

        <section className="cmp-section">
          <h2 className="section-title">At a Glance</h2>
          <div className="cmp-facts">
            {['Prep', 'Cook', 'Total', 'Makes', 'Difficulty', 'Ingredients', 'Steps'].map((k) => {
              const va = fact(ra, k), vb = fact(rb, k);
              return (
                <div className={`cmp-fact${va !== vb ? ' differs' : ''}`} key={k}>
                  <div className="cmp-fact-label">{k}</div>
                  <div className="cmp-cell">{va}</div>
                  <div className="cmp-cell">{vb}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="cmp-section">
          <h2 className="section-title">Ingredients</h2>
          <div className="cmp-colnames" aria-hidden="true"><span>{short(ra)}</span><span>{short(rb)}</span></div>
          <IngredientGroup title="In Both" rows={both} note={both.length ? 'Lined up so you can see how the amounts differ.' : undefined} />
          <IngredientGroup title={`Only in ${short(ra)}`} rows={onlyA} />
          <IngredientGroup title={`Only in ${short(rb)}`} rows={onlyB} />
        </section>

        <section className="cmp-section">
          <h2 className="section-title">Steps</h2>
          <div className="cmp-columns">
            {[ra, rb].map((r) => {
              let n = 0;
              return (
                <ol className="cmp-steps" key={r.id} aria-label={`${r.title} steps`}>
                  <li className="cmp-col-title">{r.title}</li>
                  {r.steps.filter((s) => s.text.trim()).map((s) => s.heading
                    ? <li key={s.id} className="cmp-step-heading">{s.text}</li>
                    : <li key={s.id}><span className="cmp-step-no">{++n}</span><span>{s.text}</span></li>)}
                </ol>
              );
            })}
          </div>
        </section>

        {(ra.notes.trim() || rb.notes.trim()) && (
          <section className="cmp-section">
            <h2 className="section-title">Notes</h2>
            <div className="cmp-columns">
              {[ra, rb].map((r) => <p className="cmp-notes" key={r.id}>{r.notes.trim() || '—'}</p>)}
            </div>
          </section>
        )}
      </div>

      <ComparePicker
        open={!!swapSide}
        onClose={() => setSwapSide(null)}
        exclude={[a, b]}
        onPick={replace}
        title={swapSide === 'a' ? `Replace ${short(ra)}` : `Replace ${short(rb)}`}
      />
    </>
  );
}
