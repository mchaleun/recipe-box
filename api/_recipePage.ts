// Reads a recipe out of a web page's HTML. Most recipe sites (Food Network,
// Allrecipes, NYT Cooking, food blogs on WordPress recipe plugins) publish the
// recipe as schema.org Recipe JSON-LD for Google; this turns that into the
// same fields the photo scan returns. Pure functions, so they can be tested.

export interface PageRecipe {
  title: string;
  description: string;
  servings: number;
  yieldUnit: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  ingredients: string[];
  steps: string[];
  notes: string;
  categories: string[];
  cuisine: string;
  tags: string[];
  image: string;
  site: string;
  author: string;
}

type Node = Record<string, unknown>;

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', deg: '°', frac12: '½', frac14: '¼', frac34: '¾',
  frac13: '⅓', frac23: '⅔', frac18: '⅛', eacute: 'é', egrave: 'è', ntilde: 'ñ', times: '×', reg: '®', trade: '™', copy: '©',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Plain text from a value that may hold HTML ("<p>Mix &amp; stir</p>"). */
export function clean(v: unknown): string {
  if (typeof v !== 'string') return typeof v === 'number' ? String(v) : '';
  let s = v.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div)>/gi, '\n').replace(/<[^>]+>/g, '');
  // Some sites double-encode (&amp;frac12;), so decode twice.
  s = decodeEntities(decodeEntities(s));
  return s.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
}

const oneLine = (v: unknown) => clean(v).replace(/\s*\n\s*/g, ' ');

/** "PT1H30M", "P0DT0H45M", "P0Y0M0DT1H5M0.000S", "PT90M" -> minutes. Also accepts plain numbers. */
export function isoMinutes(v: unknown): number {
  if (typeof v === 'number') return Math.round(v);
  if (typeof v !== 'string' || !/^P/i.test(v.trim())) return 0;
  const [date, time = ''] = v.trim().slice(1).toUpperCase().split('T');
  const part = (s: string, unit: string) => Number(new RegExp(`(\\d+(?:\\.\\d+)?)${unit}`).exec(s)?.[1] ?? 0);
  return Math.round(part(date, 'D') * 1440 + part(time, 'H') * 60 + part(time, 'M') + part(time, 'S') / 60);
}

/** recipeYield: 4, "4", "4 servings", "Makes 24 cookies", ["6", "6 servings"]. */
export function parseYield(v: unknown): { servings: number; yieldUnit: string } {
  const all = (Array.isArray(v) ? v : [v]).map(oneLine).filter(Boolean);
  // Prefer the entry that says what it counts ("24 cookies" over "24").
  const pick = all.find((s) => /\d\s*[a-z]/i.test(s)) ?? all[0] ?? '';
  const m = /(\d+)(?:\s*(?:-|–|to)\s*\d+)?\s*([a-z][a-z -]*)?/i.exec(pick);
  if (!m) return { servings: 0, yieldUnit: '' };
  let unit = (m[2] ?? '').trim().toLowerCase().replace(/^(about|approximately)\s+/, '');
  if (/^(servings?|serves|people|portions?|persons?)\b/.test(unit) || /^serv/.test(unit)) unit = '';
  return { servings: Number(m[1]), yieldUnit: unit.split(/\s+/).slice(0, 3).join(' ') };
}

const types = (n: Node) => (Array.isArray(n['@type']) ? n['@type'] : [n['@type']]).map(String);

/** Finds the first Recipe object anywhere in the JSON-LD (arrays, @graph, nested mainEntity). */
function findRecipe(v: unknown, depth = 0): Node | null {
  if (!v || typeof v !== 'object' || depth > 6) return null;
  if (Array.isArray(v)) {
    for (const x of v) { const r = findRecipe(x, depth + 1); if (r) return r; }
    return null;
  }
  const n = v as Node;
  if (types(n).some((t) => /(^|\/)Recipe$/i.test(t))) return n;
  for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'about']) {
    const r = findRecipe(n[k], depth + 1);
    if (r) return r;
  }
  return null;
}

function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/^<!--|-->$/g, '');
    try { out.push(JSON.parse(raw)); continue; } catch { /* try once more below */ }
    // Unescaped control characters inside strings are a common breakage.
    try { out.push(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' '))); } catch { /* skip */ }
  }
  return out;
}

/** recipeInstructions: string, [string], [HowToStep], [HowToSection{itemListElement}]. */
function instructions(v: unknown, depth = 0): string[] {
  if (depth > 4 || v == null) return [];
  if (typeof v === 'string') {
    const text = clean(v);
    return text.split('\n').map((s) => s.replace(/^(step\s*)?\d+[.):]\s*/i, '').trim()).filter(Boolean);
  }
  if (Array.isArray(v)) return v.flatMap((x) => instructions(x, depth + 1));
  if (typeof v !== 'object') return [];
  const n = v as Node;
  if (types(n).some((t) => /HowToSection/i.test(t)) || (Array.isArray(n.itemListElement) && !n.text)) {
    const name = oneLine(n.name);
    const inner = instructions(n.itemListElement, depth + 1);
    return name && inner.length ? [`## ${name}`, ...inner] : inner;
  }
  const text = clean(n.text) || clean(n.name) || clean(n.description);
  return text ? text.split('\n').filter(Boolean) : [];
}

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap(list);
  if (typeof v === 'string') return v.split(',').map(oneLine).filter(Boolean);
  if (v && typeof v === 'object') return list((v as Node).name);
  return [];
}

function imageUrl(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    // Sites often list several crops; take the biggest stated one, else the first.
    const sized = v.filter((x) => x && typeof x === 'object' && Number((x as Node).width) > 0) as Node[];
    if (sized.length) return imageUrl(sized.sort((a, b) => Number(b.width) - Number(a.width))[0]);
    return imageUrl(v[0]);
  }
  const n = v as Node;
  return typeof n.url === 'string' ? n.url : typeof n.contentUrl === 'string' ? n.contentUrl : '';
}

function name(v: unknown): string {
  if (Array.isArray(v)) return v.map(name).filter(Boolean).join(', ');
  if (typeof v === 'string') return oneLine(v);
  if (v && typeof v === 'object') return oneLine((v as Node).name);
  return '';
}

function meta(html: string, key: string): string {
  const re = new RegExp(`<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`, 'i');
  const tag = re.exec(html)?.[0];
  return tag ? oneLine(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag)?.slice(1).find((x) => x != null) ?? '') : '';
}

/** Matches the site's categories, keywords and title to the family's category names. */
export function matchCategories(words: string[], categories: string[]): string[] {
  const forms = (s: string) => { const w = s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(); return [w, w.replace(/s$/, ''), w.replace(/es$/, '')]; };
  const have = new Set(words.flatMap((p) => [p, ...p.split(/[\s,/&-]+/)]).flatMap(forms).filter(Boolean));
  return categories.filter((c) => forms(c).some((f) => f && have.has(f)));
}

/** The recipe in the page's JSON-LD, or null when the page has none. */
export function recipeFromHtml(html: string, pageUrl: string, categories: string[] = []): PageRecipe | null {
  let r: Node | null = null;
  for (const block of jsonLdBlocks(html)) if ((r = findRecipe(block))) break;
  if (!r) return null;

  const ingredients = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : Array.isArray(r.ingredients) ? r.ingredients : [r.recipeIngredient ?? r.ingredients])
    .map(oneLine).filter(Boolean);
  const steps = instructions(r.recipeInstructions);
  const title = oneLine(r.name) || oneLine(r.headline) || meta(html, 'og:title');
  if (!title || (!ingredients.length && !steps.length)) return null;

  const prep = isoMinutes(r.prepTime);
  const cook = isoMinutes(r.cookTime);
  const total = isoMinutes(r.totalTime);
  const yields = parseYield(r.recipeYield ?? r.yield);
  const siteCategories = list(r.recipeCategory);
  const keywords = list(r.keywords).map((k) => k.toLowerCase()).filter((k) => k.length <= 24 && !/^(recipe|recipes|easy)$/.test(k));
  const description = clean(r.description).split('\n')[0] ?? '';
  const notes = [r.recipeNotes, (r as Node).notes].map(clean).filter(Boolean).join('\n');
  const publisher = r.publisher && typeof r.publisher === 'object' ? name(r.publisher) : '';
  const host = new URL(pageUrl).hostname.replace(/^www\./, '');

  return {
    title,
    description: description.length > 400 ? `${description.slice(0, 397).trimEnd()}…` : description,
    servings: yields.servings,
    yieldUnit: yields.yieldUnit,
    prepMinutes: prep,
    // Some sites only give a total time; show it as cook time so it isn't lost.
    cookMinutes: cook || (!prep && total ? total : 0),
    totalMinutes: total && total !== prep + cook ? total : 0,
    ingredients,
    steps,
    notes,
    categories: matchCategories([...siteCategories, ...keywords, title], categories),
    cuisine: (list(r.recipeCuisine)[0] ?? '').replace(/^\w/, (c) => c.toUpperCase()),
    tags: [...new Set(keywords)].slice(0, 4),
    image: absolute(imageUrl(r.image) || meta(html, 'og:image'), pageUrl),
    site: meta(html, 'og:site_name') || publisher || host,
    author: name(r.author),
  };
}

function absolute(u: string, base: string): string {
  try { return u ? new URL(u, base).href : ''; } catch { return ''; }
}

/** Page title, main image and readable text, for pages without recipe data. */
export function pageText(html: string, pageUrl: string, max = 30000): { title: string; site: string; image: string; text: string } {
  const body = html
    .replace(/<(script|style|noscript|svg|iframe|template|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|footer|header|aside|form)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|p|div|li|h[1-6]|tr|section|article)\b[^>]*>/gi, '\n');
  const text = clean(body).slice(0, max);
  const title = meta(html, 'og:title') || oneLine(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '');
  return {
    title,
    site: meta(html, 'og:site_name') || new URL(pageUrl).hostname.replace(/^www\./, ''),
    image: absolute(meta(html, 'og:image'), pageUrl),
    text,
  };
}
