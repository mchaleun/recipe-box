import type { Recipe } from '../types';

export function totalMinutes(r: Pick<Recipe, 'prepMinutes' | 'cookMinutes' | 'totalMinutes'>): number | undefined {
  if (r.totalMinutes) return r.totalMinutes;
  const sum = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
  return sum > 0 ? sum : undefined;
}

/** "45 min", "1 hr 30 min", "2 days". */
export function formatMinutes(min?: number): string {
  if (!min || min <= 0) return '—';
  if (min >= 60 * 24 && min % (60 * 24) === 0) {
    const d = min / (60 * 24);
    return `${d} day${d === 1 ? '' : 's'}`;
  }
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

export interface DetectedTimer {
  label: string;
  seconds: number;
}

/** Finds durations in a step ("simmer 15 minutes", "rest 30–60 min", "1 hour")
 *  so Cooking Mode can offer a one-tap timer. Ranges use the lower bound. */
export function detectTimers(text: string): DetectedTimer[] {
  const re = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
  const out: DetectedTimer[] = [];
  for (const m of text.matchAll(re)) {
    const n = parseFloat(m[1]);
    const unit = m[3].toLowerCase();
    const mult = unit.startsWith('h') ? 3600 : unit.startsWith('m') ? 60 : 1;
    const seconds = Math.round(n * mult);
    // Skip absurd values (e.g. "16-24 hours" fridge rests are still valid, a week is not).
    if (seconds < 5 || seconds > 48 * 3600) continue;
    if (out.some((t) => t.seconds === seconds)) continue;
    out.push({ label: m[0].replace(/\s+/g, ' '), seconds });
  }
  return out.slice(0, 3);
}

export function relativeDay(ts?: number): string {
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
