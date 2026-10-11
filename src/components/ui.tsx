import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { href as toHref, navigate, type Route } from '../router';
import { Icon } from './Icon';
import type { Category, Recipe } from '../types';
import { useStore } from '../store';
import { formatMinutes, totalMinutes } from '../lib/time';

/** In-app link: a real <a href> (so open-in-new-tab works) that navigates without reload. */
export function Link({ to, className, children, style, ariaLabel }: { to: Route; className?: string; children: ReactNode; style?: CSSProperties; ariaLabel?: string }) {
  return (
    <a
      href={toHref(to)}
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={(e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [threshold]);
  return scrolled;
}

export function TopBar({ title, start, end, alwaysSolid }: { title?: string; start?: ReactNode; end?: ReactNode; alwaysSolid?: boolean }) {
  const scrolled = useScrolled(alwaysSolid ? -1 : 40);
  return (
    <header className={`topbar${scrolled ? ' scrolled' : ''}`}>
      <div className="topbar-inner">
        <div className="topbar-side">{start}</div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-side end">{end}</div>
      </div>
    </header>
  );
}

// ---------- Generated artwork ----------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function artStyle(recipe: Pick<Recipe, 'id' | 'title' | 'categoryIds'>, categories: Category[]): CSSProperties {
  const cat = categories.find((c) => recipe.categoryIds.includes(c.id));
  const h = hash(recipe.id);
  const base = cat ? cat.hue : h % 360;
  const hue1 = (base + ((h >> 3) % 24) - 12 + 360) % 360;
  const hue2 = (hue1 + 24 + ((h >> 8) % 20)) % 360;
  const x = 20 + ((h >> 12) % 60);
  // Soft, low-saturation washes so placeholder art sits quietly next to real photos.
  return {
    background: `radial-gradient(110% 80% at ${x}% 0%, hsl(${hue2} 70% 88%) 0%, transparent 65%),
      radial-gradient(90% 90% at ${100 - x}% 100%, hsl(${hue1} 45% 62%) 0%, transparent 70%),
      linear-gradient(160deg, hsl(${hue1} 50% 78%), hsl(${hue2} 42% 66%))`,
  };
}

export function RecipeArt({ recipe, className = 'art' }: { recipe: Recipe; className?: string }) {
  const { state } = useStore();
  if (recipe.photo) return <img src={recipe.photo} alt="" className={className === 'art' ? undefined : className} loading="lazy" />;
  const letter = (recipe.title.trim()[0] ?? '?').toUpperCase();
  return (
    <div className="art-wrap">
      <div className={className} style={{ ...artStyle(recipe, state.categories), width: '100%', height: '100%' }} aria-hidden="true">
        <span className="art-letter">{letter}</span>
      </div>
    </div>
  );
}

// ---------- Recipe card ----------

export function recipeMeta(r: Recipe, categories: Category[], parts: ('category' | 'time' | 'difficulty')[] = ['category', 'time']): string {
  const out: string[] = [];
  for (const p of parts) {
    if (p === 'category') {
      const c = categories.find((c) => r.categoryIds.includes(c.id));
      if (c) out.push(c.name);
    }
    if (p === 'time') {
      const t = totalMinutes(r);
      if (t) out.push(formatMinutes(t));
    }
    if (p === 'difficulty' && r.difficulty) out.push(r.difficulty);
  }
  return out.join(' · ');
}

export function FavoriteButton({ recipe, className = 'fav-btn' }: { recipe: Recipe; className?: string }) {
  const { dispatch } = useStore();
  const [popKey, setPopKey] = useState(0);
  return (
    <button
      type="button"
      className={`${className}${recipe.favorite ? ' on' : ''}`}
      aria-label={recipe.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
      aria-pressed={recipe.favorite}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: 'toggleFavorite', id: recipe.id });
        setPopKey((k) => k + 1);
      }}
    >
      <span key={popKey} className={popKey ? 'pop' : undefined} style={{ display: 'grid' }}>
        <Icon name="heart" filled={recipe.favorite} size={20} />
      </span>
    </button>
  );
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { state } = useStore();
  return (
    <Link to={{ name: 'recipe', id: recipe.id }} className="card">
      <div className="card-media">
        <RecipeArt recipe={recipe} />
        <FavoriteButton recipe={recipe} />
      </div>
      <div className="card-body">
        <div className="card-title">{recipe.title}</div>
        <div className="card-meta">{recipeMeta(recipe, state.categories, ['category', 'time', 'difficulty'])}</div>
      </div>
    </Link>
  );
}

export function RowCard({ recipe, trailing }: { recipe: Recipe; trailing?: ReactNode }) {
  const { state } = useStore();
  return (
    <div className="row-card">
      <div className="thumb"><RecipeArt recipe={recipe} /></div>
      <div className="text">
        <div className="title">{recipe.title}</div>
        <div className="meta">{recipeMeta(recipe, state.categories)}</div>
      </div>
      {trailing}
    </div>
  );
}

// ---------- Sheet ----------

export function Sheet({ open, onClose, title, children, footer, headEnd }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; headEnd?: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 260);
      return () => clearTimeout(t);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [mounted, onClose]);

  if (!mounted) return null;
  // Portal to <body> so the sheet sits above bars regardless of page transforms.
  return createPortal(
    <div className={`sheet-root${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" ref={ref} tabIndex={-1}>
        <div className="sheet-grabber" />
        <div className="sheet-head">
          <h2>{title}</h2>
          {headEnd ?? (
            <button className="icon-btn plain" onClick={onClose} aria-label="Close">
              <span style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--fill)', display: 'grid', placeItems: 'center', color: 'var(--text-2)' }}>
                <Icon name="close" size={15} stroke={2.4} />
              </span>
            </button>
          )}
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Menu ----------

export interface MenuItem { label: string; icon?: string; onSelect: () => void; danger?: boolean; checked?: boolean; divider?: boolean }

export function Menu({ items, label = 'More', icon = 'more', heading }: { items: MenuItem[]; label?: string; icon?: string; heading?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="icon-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name={icon} />
      </button>
      {open && (
        <div className="menu" role="menu">
          {heading && <div className="menu-label">{heading}</div>}
          {items.map((it, i) => (
            <div key={i}>
              {it.divider && <hr />}
              <button role="menuitem" className={it.danger ? 'danger' : undefined} onClick={() => { setOpen(false); it.onSelect(); }}>
                <span>{it.label}</span>
                {it.checked ? <Icon name="check" size={18} /> : it.icon ? <Icon name={it.icon} size={19} /> : null}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Toast ----------

interface ToastMsg { text: string; action?: { label: string; run: () => void } }
const ToastCtx = createContext<(t: ToastMsg) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastMsg & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((t: ToastMsg) => {
    clearTimeout(timer.current);
    setToast({ ...t, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), t.action ? 5000 : 2400);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" key={toast.key} role="status">
          <span>{toast.text}</span>
          {toast.action && <button onClick={() => { toast.action!.run(); setToast(null); }}>{toast.action.label}</button>}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export function EmptyState({ icon, title, children, action }: { icon: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="glyph"><Icon name={icon} size={30} /></div>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}
