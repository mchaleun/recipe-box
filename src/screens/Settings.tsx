import { useState } from 'react';
import { useStore } from '../store';
import type { LibrarySnapshot } from '../types';
import { Icon } from '../components/Icon';
import { Sheet, TopBar, useToast } from '../components/ui';
import { goBack } from '../router';

type Theme = 'system' | 'light' | 'dark';

export function applyTheme(t: Theme) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
export function savedTheme(): Theme {
  try { return (localStorage.getItem('recipe-box:theme') as Theme) || 'system'; } catch { return 'system'; }
}

export function Settings() {
  const { state, dispatch, newId, resetToSamples, persistent, storageLabel } = useStore();
  const toast = useToast();
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const [adding, setAdding] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    try { localStorage.setItem('recipe-box:theme', t); } catch { /* not saved */ }
  };

  const exportJson = JSON.stringify(state, null, 2);
  const counts = (id: string) => state.recipes.filter((r) => r.categoryIds.includes(id)).length;
  const deleting = state.categories.find((c) => c.id === confirmDelete);

  const download = () => {
    if (storageLabel === 'Home server') { location.href = '/api/backup'; return; }
    try {
      const blob = new Blob([exportJson], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `recipe-box-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { /* blocked */ }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(exportJson); toast({ text: 'Library copied' }); }
    catch { toast({ text: 'Copy isn’t available here. Use Download instead.' }); }
  };
  const doImport = () => {
    try {
      const data = JSON.parse(importText) as LibrarySnapshot;
      if (data.version !== 1 || !Array.isArray(data.recipes) || !Array.isArray(data.categories)) throw new Error();
      dispatch({ type: 'replace', snapshot: { ...data, collections: data.collections ?? [], progress: data.progress ?? {} } });
      setImportOpen(false);
      setImportText('');
      toast({ text: `Imported ${data.recipes.length} recipes` });
    } catch {
      setImportError('That doesn’t look like a Recipe Box backup. Paste the full text from Export.');
    }
  };

  return (
    <>
      <TopBar title="Settings" start={<button className="text-btn" onClick={() => goBack()}><Icon name="back" />Back</button>} />
      <div className="page settings page-enter">
        <h1 className="large-title">Settings</h1>

        <div className="list-head">Appearance</div>
        <div className="list" style={{ padding: 6 }}>
          <div className="segmented full" role="radiogroup" aria-label="Appearance">
            {(['system', 'light', 'dark'] as Theme[]).map((t) => (
              <button key={t} role="radio" aria-checked={theme === t} className={theme === t ? 'on' : ''} onClick={() => chooseTheme(t)}>
                {t === 'system' ? 'Automatic' : t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>

        <div className="list-head">Categories</div>
        <div className="list">
          {state.categories.map((c, i) => (
            <div className="list-row" key={c.id}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: `hsl(${c.hue} 70% 58%)`, flex: 'none' }} aria-hidden="true" />
              <div className="grow">
                <input
                  id={`cat-${c.id}`}
                  className="inline"
                  value={c.name}
                  aria-label={`Rename ${c.name}`}
                  onChange={(e) => dispatch({ type: 'renameCategory', id: c.id, name: e.target.value })}
                  onBlur={(e) => { if (!e.target.value.trim()) dispatch({ type: 'renameCategory', id: c.id, name: 'Untitled' }); }}
                />
              </div>
              <span className="value footnote">{counts(c.id) || ''}</span>
              <button className="icon-btn plain" style={{ width: 36, height: 36 }} disabled={i === 0} onClick={() => dispatch({ type: 'moveCategory', id: c.id, delta: -1 })} aria-label={`Move ${c.name} up`}><Icon name="up" size={18} /></button>
              <button className="icon-btn plain" style={{ width: 36, height: 36 }} disabled={i === state.categories.length - 1} onClick={() => dispatch({ type: 'moveCategory', id: c.id, delta: 1 })} aria-label={`Move ${c.name} down`}><Icon name="down" size={18} /></button>
              <button className="icon-btn" style={{ width: 36, height: 36, color: 'var(--danger)' }} onClick={() => setConfirmDelete(c.id)} aria-label={`Delete ${c.name}`}><Icon name="trash" size={18} /></button>
            </div>
          ))}
          <form className="list-row" onSubmit={(e) => {
            e.preventDefault();
            const name = adding.trim();
            if (!name) return;
            dispatch({ type: 'addCategory', category: { id: newId(), name, hue: Math.floor(Math.random() * 360) } });
            setAdding('');
          }}>
            <Icon name="plus" size={18} className="tertiary" />
            <div className="grow"><input id="new-category" className="inline" placeholder="New Category" value={adding} onChange={(e) => setAdding(e.target.value)} /></div>
            {adding.trim() && <button className="text-btn strong" type="submit">Add</button>}
          </form>
        </div>
        <p className="list-foot">Categories are yours to shape. Rename, reorder, or add your own; a recipe can belong to several.</p>

        <div className="list-head">Your Library</div>
        <div className="list">
          <div className="list-row"><div className="grow">Recipes</div><span className="value">{state.recipes.length}</span></div>
          <div className="list-row"><div className="grow">Collections</div><span className="value">{state.collections.length}</span></div>
          <div className="list-row"><div className="grow">Saved on</div><span className="value">{storageLabel}</span></div>
          <button className="list-row button" onClick={download}>Download Backup</button>
          <button className="list-row button" onClick={copy}>Copy Backup as Text</button>
          <button className="list-row button" onClick={() => { setImportError(''); setImportOpen(true); }}>Restore from Backup…</button>
          <button className="list-row button danger" onClick={() => setConfirmReset(true)}>Reset to Sample Recipes…</button>
        </div>
        <p className="list-foot">
          {storageLabel === 'Online'
            ? 'Recipes are saved online, so every phone, iPad and laptop sees the same library. A copy of each day’s library is kept as a backup.'
            : storageLabel === 'Home server'
            ? 'Recipes are saved on the home server, so every device in the house sees the same library. The server also keeps a daily backup.'
            : persistent
              ? 'Recipes are saved in this browser. Download a backup before clearing browser data or switching devices.'
              : 'This browser isn’t allowing storage, so changes last until you close the page.'}
        </p>
      </div>

      <Sheet open={!!deleting} onClose={() => setConfirmDelete(null)} title={`Delete “${deleting?.name ?? ''}”?`} footer={
        <>
          <button className="btn secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn primary" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => { if (deleting) dispatch({ type: 'deleteCategory', id: deleting.id }); setConfirmDelete(null); }}>Delete</button>
        </>
      }>
        <p className="secondary">{deleting && counts(deleting.id) ? `${counts(deleting.id)} recipes use this category. They stay in your library without it.` : 'No recipes use this category.'}</p>
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset to Sample Recipes?" footer={
        <>
          <button className="btn secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
          <button className="btn primary" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => { resetToSamples(); setConfirmReset(false); toast({ text: 'Library reset' }); }}>Reset</button>
        </>
      }>
        <p className="secondary">This replaces everything in this browser with the starter recipes. Download a backup first if you want to keep your changes.</p>
      </Sheet>

      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title="Restore from Backup" footer={
        <>
          <button className="btn secondary" onClick={() => setImportOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={doImport} disabled={!importText.trim()}>Restore</button>
        </>
      }>
        <p className="secondary" style={{ marginBottom: 12 }}>Paste the text of a backup. It replaces the library in this browser.</p>
        <textarea id="import-text" className="ed-bulk" style={{ minHeight: 180, width: '100%' }} value={importText} onChange={(e) => { setImportText(e.target.value); setImportError(''); }} placeholder='{"version": 1, "recipes": [...]}' />
        <input id="import-file" type="file" accept="application/json,.json" style={{ marginTop: 12 }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImportText(await f.text()); }} />
        {importError && <p className="footnote" style={{ color: 'var(--danger)', marginTop: 8 }}>{importError}</p>}
      </Sheet>
    </>
  );
}
