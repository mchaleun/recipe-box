import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type TextareaHTMLAttributes } from 'react';
import { useStore } from '../store';
import type { Difficulty, Ingredient, Recipe, Step } from '../types';
import { Icon } from '../components/Icon';
import { RecipeArt, Sheet, TopBar, useToast } from '../components/ui';
import { goBack, navigate } from '../router';
import { formatMinutes } from '../lib/time';
import { uid } from '../data/repository';

function blankRecipe(): Recipe {
  const now = Date.now();
  return {
    id: uid(), title: '', description: '', categoryIds: [], cuisine: '', tags: [], servings: 4,
    ingredients: [{ id: uid(), text: '' }], steps: [{ id: uid(), text: '' }], notes: '',
    favorite: false, createdAt: now, updatedAt: now, viewCount: 0, cookCount: 0,
  };
}

function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(fit, [props.value]);
  useEffect(() => {
    // Re-fit when the width changes (rotation, window resize, first layout).
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => { if (el.clientWidth !== w) { w = el.clientWidth; fit(); } });
    ro.observe(el);
    requestAnimationFrame(fit);
    return () => ro.disconnect();
  }, []);
  return <textarea ref={ref} rows={1} {...props} />;
}

/** Downscales a photo so the library stays fast and small. */
function readPhoto(file: File, max = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file isn’t an image this browser can open.')); };
    img.src = url;
  });
}

type Line = Ingredient | Step;

function linesToText(lines: Line[]): string {
  return lines.filter((l) => l.text.trim()).map((l) => (l.heading ? `## ${l.text}` : l.text)).join('\n');
}

function textToLines(text: string, numbered: boolean): Line[] {
  return text.split('\n').map((raw) => raw.trim()).filter(Boolean).map((raw) => {
    const heading = raw.startsWith('#') || (/:$/.test(raw) && raw.length < 40);
    let t = raw.replace(/^#+\s*/, '').replace(/:$/, heading ? '' : ':');
    if (!heading) t = numbered ? t.replace(/^(step\s*)?\d+[.)]\s*/i, '') : t.replace(/^[-•*☐□]\s*/, '');
    return { id: uid(), text: t, ...(heading ? { heading: true } : {}) };
  });
}

function LinesEditor({ label, lines, onChange, numbered, placeholder, addLabel }: {
  label: string; lines: Line[]; onChange: (l: Line[]) => void; numbered?: boolean; placeholder: string; addLabel: string;
}) {
  const [textMode, setTextMode] = useState(false);
  const [text, setText] = useState('');
  const focusId = useRef<string | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusId.current) {
      container.current?.querySelector<HTMLElement>(`[data-line="${focusId.current}"]`)?.focus();
      focusId.current = null;
    }
  });

  const update = (id: string, text: string) => onChange(lines.map((l) => (l.id === id ? { ...l, text } : l)));
  const insertAfter = (id: string | null, heading = false) => {
    const line: Line = { id: uid(), text: '', ...(heading ? { heading: true } : {}) };
    const i = id ? lines.findIndex((l) => l.id === id) : lines.length - 1;
    const next = [...lines];
    next.splice(i + 1, 0, line);
    focusId.current = line.id;
    onChange(next);
  };
  const remove = (id: string) => {
    const i = lines.findIndex((l) => l.id === id);
    const next = lines.filter((l) => l.id !== id);
    focusId.current = next[Math.max(0, i - 1)]?.id ?? null;
    onChange(next.length ? next : [{ id: uid(), text: '' }]);
  };
  const move = (id: string, d: number) => {
    const i = lines.findIndex((l) => l.id === id);
    const j = i + d;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    focusId.current = id;
    onChange(next);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, l: Line) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); insertAfter(l.id); }
    if (e.key === 'Backspace' && !l.text && lines.length > 1) { e.preventDefault(); remove(l.id); }
    if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); move(l.id, -1); }
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); move(l.id, 1); }
  };

  let n = 0;
  return (
    <section className="ed-section">
      <div className="ed-section-head">
        <h2 className="section-title">{label}</h2>
        <button className="text-btn" onClick={() => {
          if (textMode) onChange(textToLines(text, !!numbered).length ? textToLines(text, !!numbered) : [{ id: uid(), text: '' }]);
          else setText(linesToText(lines));
          setTextMode(!textMode);
        }}>{textMode ? 'Done' : 'Edit as Text'}</button>
      </div>
      {textMode ? (
        <>
          <AutoTextarea
            id={`${label}-text`}
            className="ed-bulk"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={numbered ? 'Paste steps, one per line' : 'Paste ingredients, one per line'}
            autoFocus
          />
          <p className="footnote" style={{ marginTop: 8 }}>One per line. Start a line with ## or end it with a colon to make a section heading.</p>
        </>
      ) : (
        <div className="ed-lines" ref={container}>
          {lines.map((l) => {
            if (!l.heading) n += 1;
            return (
              <div key={l.id} className={`ed-line${l.heading ? ' heading' : ''}`}>
                <span className="ed-marker" aria-hidden="true">{l.heading ? '' : numbered ? n : '•'}</span>
                <AutoTextarea
                  data-line={l.id}
                  value={l.text}
                  placeholder={l.heading ? 'Section name' : placeholder}
                  aria-label={l.heading ? 'Section name' : numbered ? `Step ${n}` : 'Ingredient'}
                  onChange={(e) => update(l.id, e.target.value.replace(/\n/g, ' '))}
                  onKeyDown={(e) => onKey(e, l)}
                />
                <div className="ed-line-tools">
                  <button onClick={() => move(l.id, -1)} aria-label="Move up"><Icon name="up" size={16} /></button>
                  <button onClick={() => move(l.id, 1)} aria-label="Move down"><Icon name="down" size={16} /></button>
                  <button onClick={() => remove(l.id)} aria-label="Remove" className="rm"><Icon name="minus" size={16} stroke={2.4} /></button>
                </div>
              </div>
            );
          })}
          <div className="ed-add-row">
            <button className="text-btn" onClick={() => insertAfter(lines[lines.length - 1]?.id ?? null)}><Icon name="plus" size={18} /> {addLabel}</button>
            <button className="text-btn" onClick={() => insertAfter(lines[lines.length - 1]?.id ?? null, true)}>Add Section</button>
          </div>
        </div>
      )}
    </section>
  );
}

function NumberField({ id, label, value, onChange, placeholder, hint }: { id: string; label: string; value?: number; onChange: (v?: number) => void; placeholder?: string; hint?: string }) {
  return (
    <label className="ed-field" htmlFor={id}>
      <span className="ed-label">{label}</span>
      <span className="ed-num">
        <input id={id} inputMode="numeric" pattern="[0-9]*" value={value ?? ''} placeholder={placeholder ?? '0'}
          onChange={(e) => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); onChange(Number.isFinite(v) && v > 0 ? v : undefined); }} />
        <span className="unit">min</span>
      </span>
      {hint && <span className="ed-hint">{hint}</span>}
    </label>
  );
}

export function RecipeEditor({ id }: { id: string }) {
  const { state, dispatch, newId } = useStore();
  const toast = useToast();
  const existing = state.recipes.find((r) => r.id === id);
  const isNew = !existing;
  const [draft, setDraft] = useState<Recipe>(() => (existing ? structuredClone(existing) : blankRecipe()));
  const original = useRef(JSON.stringify(draft));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [photoError, setPhotoError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Recipe>(k: K, v: Recipe[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== original.current;
  const cuisines = useMemo(() => [...new Set(state.recipes.map((r) => r.cuisine).filter(Boolean))].sort(), [state.recipes]);
  const computedTotal = (draft.prepMinutes ?? 0) + (draft.cookMinutes ?? 0);

  const save = () => {
    if (!draft.title.trim()) return;
    const clean: Recipe = {
      ...draft,
      title: draft.title.trim(),
      cuisine: draft.cuisine.trim(),
      ingredients: draft.ingredients.filter((l) => l.text.trim()).map((l) => ({ ...l, text: l.text.trim() })),
      steps: draft.steps.filter((l) => l.text.trim()).map((l) => ({ ...l, text: l.text.trim() })),
      totalMinutes: draft.totalMinutes && draft.totalMinutes !== computedTotal ? draft.totalMinutes : undefined,
      source: draft.source?.label.trim() || draft.source?.url?.trim() ? { ...draft.source, label: draft.source.label.trim() || 'Link' } : draft.source?.file ? draft.source : undefined,
    };
    dispatch({ type: 'upsertRecipe', recipe: clean });
    toast({ text: isNew ? 'Recipe added' : 'Changes saved' });
    if (isNew) navigate({ name: 'recipe', id: clean.id }, { replace: true });
    else goBack({ name: 'recipe', id: clean.id });
  };
  const cancel = () => (dirty ? setConfirmDiscard(true) : goBack(isNew ? { name: 'library' } : { name: 'recipe', id }));

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '').toLowerCase();
    if (t && !draft.tags.includes(t)) set('tags', [...draft.tags, t]);
    setTagInput('');
  };

  return (
    <>
      <TopBar
        alwaysSolid
        title={isNew ? 'New Recipe' : 'Edit Recipe'}
        start={<button className="text-btn" onClick={cancel}>Cancel</button>}
        end={<button className="text-btn strong" onClick={save} disabled={!draft.title.trim()}>{isNew ? 'Add' : 'Done'}</button>}
      />
      <div className="page editor page-enter">
        <div className="ed-top">
          <div className="ed-photo">
            <button className="ed-photo-btn" onClick={() => fileRef.current?.click()} aria-label={draft.photo ? 'Change photo' : 'Add photo'}>
              {draft.photo ? <img src={draft.photo} alt="" /> : draft.title ? <RecipeArt recipe={draft} /> : <span className="ed-photo-empty" />}
              <span className="ed-photo-label"><Icon name="photo" size={18} /> {draft.photo ? 'Change Photo' : 'Add Photo'}</span>
            </button>
            {draft.photo && <button className="text-btn" style={{ color: 'var(--danger)' }} onClick={() => set('photo', undefined)}>Remove Photo</button>}
            {photoError && <p className="footnote" style={{ color: 'var(--danger)' }}>{photoError}</p>}
            <input ref={fileRef} id="photo-input" type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try { setPhotoError(''); set('photo', await readPhoto(f)); } catch (err) { setPhotoError((err as Error).message); }
            }} />
          </div>
          <div className="ed-head">
            <AutoTextarea id="ed-title" className="ed-title" placeholder="Recipe Name" value={draft.title} onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))} aria-label="Recipe name" autoFocus={isNew} />
            <AutoTextarea id="ed-desc" className="ed-desc" placeholder="A short description" value={draft.description} onChange={(e) => set('description', e.target.value)} aria-label="Description" />
          </div>
        </div>

        <section className="ed-section">
          <h2 className="section-title">Details</h2>
          <div className="ed-grid">
            <NumberField id="ed-prep" label="Prep" value={draft.prepMinutes} onChange={(v) => set('prepMinutes', v)} hint={draft.prepMinutes && draft.prepMinutes >= 60 ? formatMinutes(draft.prepMinutes) : undefined} />
            <NumberField id="ed-cook" label="Cook" value={draft.cookMinutes} onChange={(v) => set('cookMinutes', v)} hint={draft.cookMinutes && draft.cookMinutes >= 60 ? formatMinutes(draft.cookMinutes) : undefined} />
            <NumberField id="ed-total" label="Total" value={draft.totalMinutes} onChange={(v) => set('totalMinutes', v)} placeholder={computedTotal ? String(computedTotal) : '0'}
              hint={draft.totalMinutes ? formatMinutes(draft.totalMinutes) : 'Include rising or chilling time'} />
            <label className="ed-field" htmlFor="ed-serv">
              <span className="ed-label">Makes</span>
              <span className="ed-num">
                <input id="ed-serv" inputMode="numeric" value={draft.servings || ''} onChange={(e) => set('servings', Math.max(1, parseInt(e.target.value.replace(/\D/g, ''), 10) || 1))} />
                <input id="ed-yield" className="unit-input" value={draft.yieldUnit ?? ''} placeholder="servings" onChange={(e) => set('yieldUnit', e.target.value || undefined)} aria-label="Serving unit" />
              </span>
            </label>
          </div>

          <div className="ed-row">
            <span className="ed-label">Difficulty</span>
            <div className="segmented" role="radiogroup" aria-label="Difficulty">
              {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => (
                <button key={d} role="radio" aria-checked={draft.difficulty === d} className={draft.difficulty === d ? 'on' : ''} onClick={() => set('difficulty', draft.difficulty === d ? undefined : d)}>{d}</button>
              ))}
            </div>
          </div>

          <label className="ed-row" htmlFor="ed-cuisine">
            <span className="ed-label">Cuisine</span>
            <input id="ed-cuisine" className="ed-input" list="cuisine-list" placeholder="Lao, Italian, American…" value={draft.cuisine} onChange={(e) => set('cuisine', e.target.value)} />
            <datalist id="cuisine-list">{cuisines.map((c) => <option key={c} value={c} />)}</datalist>
          </label>

          <div className="ed-row stack">
            <span className="ed-label">Categories</span>
            <div className="wrap-chips">
              {state.categories.map((c) => {
                const on = draft.categoryIds.includes(c.id);
                return (
                  <button key={c.id} className={`chip soft${on ? ' on' : ''}`} aria-pressed={on}
                    onClick={() => set('categoryIds', on ? draft.categoryIds.filter((x) => x !== c.id) : [...draft.categoryIds, c.id])}>{c.name}</button>
                );
              })}
              {newCategory === null ? (
                <button className="chip soft" style={{ color: 'var(--accent-text)' }} onClick={() => setNewCategory('')}><Icon name="plus" size={15} /> New</button>
              ) : (
                <form className="chip-input" onSubmit={(e) => {
                  e.preventDefault();
                  const name = newCategory.trim();
                  if (name) {
                    const found = state.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
                    const cid = found?.id ?? newId();
                    if (!found) dispatch({ type: 'addCategory', category: { id: cid, name, hue: Math.floor(Math.random() * 360) } });
                    if (!draft.categoryIds.includes(cid)) set('categoryIds', [...draft.categoryIds, cid]);
                  }
                  setNewCategory(null);
                }}>
                  <input id="ed-newcat" autoFocus placeholder="Category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onBlur={(e) => e.currentTarget.form?.requestSubmit()} />
                </form>
              )}
            </div>
          </div>

          <div className="ed-row stack">
            <span className="ed-label">Tags</span>
            <div className="wrap-chips">
              {draft.tags.map((t) => (
                <button key={t} className="chip soft" onClick={() => set('tags', draft.tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`}>
                  #{t} <span className="x"><Icon name="close" size={13} stroke={2.2} /></span>
                </button>
              ))}
              <input id="ed-tag" className="tag-input" placeholder="Add tag" value={tagInput}
                onChange={(e) => { const v = e.target.value; if (/[,\n]$/.test(v)) addTag(v.slice(0, -1)); else setTagInput(v); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } if (e.key === 'Backspace' && !tagInput && draft.tags.length) set('tags', draft.tags.slice(0, -1)); }}
                onBlur={() => tagInput && addTag(tagInput)} />
            </div>
          </div>
        </section>

        <LinesEditor label="Ingredients" lines={draft.ingredients} onChange={(l) => set('ingredients', l)} placeholder="1 cup flour" addLabel="Add Ingredient" />
        <LinesEditor label="Steps" lines={draft.steps} onChange={(l) => set('steps', l)} numbered placeholder="Describe this step" addLabel="Add Step" />

        <section className="ed-section">
          <h2 className="section-title">Notes</h2>
          <AutoTextarea id="ed-notes" className="ed-notes" placeholder="Tweaks, substitutions, what to try next time" value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
        </section>

        <section className="ed-section">
          <h2 className="section-title">Source</h2>
          <div className="ed-grid two">
            <label className="ed-field" htmlFor="ed-src"><span className="ed-label">Name</span>
              <input id="ed-src" className="ed-input" placeholder="Grandma, a cookbook, a website" value={draft.source?.label ?? ''} onChange={(e) => set('source', { ...draft.source, label: e.target.value })} />
            </label>
            <label className="ed-field" htmlFor="ed-url"><span className="ed-label">Link</span>
              <input id="ed-url" className="ed-input" type="url" placeholder="https://" value={draft.source?.url ?? ''} onChange={(e) => set('source', { label: draft.source?.label ?? '', ...draft.source, url: e.target.value || undefined })} />
            </label>
          </div>
          {draft.source?.file && <p className="footnote" style={{ marginTop: 8 }}>Imported from {draft.source.file}</p>}
        </section>

        <div className="ed-save">
          <button className="btn primary lg block" onClick={save} disabled={!draft.title.trim()}>{isNew ? 'Add Recipe' : 'Save Changes'}</button>
          {!draft.title.trim() && <p className="footnote" style={{ textAlign: 'center', marginTop: 8 }}>Give the recipe a name to save it.</p>}
        </div>
      </div>

      <Sheet open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="Discard Changes?" footer={
        <>
          <button className="btn secondary" onClick={() => setConfirmDiscard(false)}>Keep Editing</button>
          <button className="btn primary" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => { setConfirmDiscard(false); goBack(isNew ? { name: 'library' } : { name: 'recipe', id }); }}>Discard</button>
        </>
      }>
        <p className="secondary">Your edits to this recipe haven’t been saved.</p>
      </Sheet>
    </>
  );
}
