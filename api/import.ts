// Imports a recipe from a web page link (Food Network, Allrecipes, a food blog…)
// and returns it as structured fields for the editor to fill in.
//
// Most recipe sites publish the recipe as schema.org JSON-LD, which is read
// directly (no AI, instant, exact wording). Pages without it fall back to the
// same AI reader as the photo scan, given the page's text.
//
//   POST /api/import  <- { url: "https://…", categories: ["Breads", ...] }
//                        (or { url: "<the recipe text, copied from the page>" } for sites that block reading)
//                     -> { recipe: { title, ingredients: [...], steps: [...], image, source: { label, url } ... } }
//   GET  /api/import?image=<url>  -> the recipe's photo (sites don't allow the browser to copy it directly)

import { readRecipe } from './_ai';
import { pageText, recipeFromHtml } from './_recipePage';

function authorized(req: Request) {
  const want = (process.env.FAMILY_PASSCODE ?? '').trim().toLowerCase();
  if (!want) return true;
  return (req.headers.get('x-family-passcode') ?? '').trim().toLowerCase() === want;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  // Some sites (Food Network's Akamai) turn away requests that don't look like a page visit.
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
};
const BLOCKED = 'This website doesn’t let apps read its recipes. Copy the recipe text from the page and paste it here, or take a screenshot and use Scan a Recipe below.';
const NO_RECIPE = 'Couldn’t find a recipe on that page. Make sure the link opens the recipe itself.';
const MAX_PAGE = 6 * 1024 * 1024;
const MAX_IMAGE = 4 * 1024 * 1024;

/** Only public http(s) sites: no localhost, private networks or cloud metadata addresses. */
function publicUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h.includes('.') || /(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(h)) return null;
  if (/^[\d.]+$/.test(h)) {
    const [a, b] = h.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224) return null;
  }
  if (h.includes(':')) return null; // IPv6 literals: not worth the risk for recipe sites
  return u;
}

/** Fetches a public URL, checking every redirect, and reads at most `max` bytes. */
async function fetchPublic(url: URL, accept: string, max: number): Promise<{ res: Response; body: Uint8Array; url: URL } | { error: string }> {
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    const dest = accept.startsWith('image/') ? { 'sec-fetch-dest': 'image', 'sec-fetch-mode': 'no-cors' } : {};
    const res = await fetch(current, { headers: { ...HEADERS, accept, ...dest }, redirect: 'manual', signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (!res) return { error: 'unreachable' };
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = publicUrl(new URL(res.headers.get('location')!, current).href);
      if (!next) return { error: 'unreachable' };
      current = next;
      continue;
    }
    if (!res.ok) return { error: String(res.status) };
    if (Number(res.headers.get('content-length') ?? 0) > max) return { error: 'too-large' };
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) { await reader.cancel(); return { error: 'too-large' }; }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) { body.set(c, at); at += c.length; }
    return { res, body, url: current };
  }
  return { error: 'unreachable' };
}

function decode(body: Uint8Array, res: Response): string {
  const charset = /charset=([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1] ?? 'utf-8';
  try { return new TextDecoder(charset).decode(body); } catch { return new TextDecoder().decode(body); }
}

export async function POST(req: Request) {
  if (!authorized(req)) return json(401, { error: 'passcode' });
  const body = (await req.json().catch(() => null)) as { url?: string; categories?: string[] } | null;
  const raw = String(body?.url ?? '').trim();
  const categories = (body?.categories ?? []).filter((c) => typeof c === 'string').slice(0, 60);
  // People paste whole share texts ("Check this out! https://…"); take the link out of it.
  const link = /https?:\/\/\S+/i.exec(raw)?.[0] ?? (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(raw) ? `https://${raw}` : '');
  // Longer text without a link (or with lots around it) is the recipe itself, copied from a page.
  if (raw.length > 150 && raw.length > (link?.length ?? 0) * 3) return fromText(raw.slice(0, 30000), '', categories, null);
  const url = link ? publicUrl(link.replace(/[).,]+$/, '')) : null;
  if (!url) return json(400, { error: 'Paste a link to a recipe, like https://www.foodnetwork.com/recipes/…' });

  const page = await fetchPublic(url, HEADERS.accept, MAX_PAGE);
  if ('error' in page) {
    console.error('import fetch failed', url.href, page.error);
    if (page.error === '404' || page.error === '410') return json(422, { error: 'That page wasn’t found. Check the link and try again.' });
    if (/^4\d\d$/.test(page.error)) return json(422, { error: BLOCKED, blocked: true });
    return json(502, { error: 'Couldn’t open that page. Check the link, or try again in a minute.' });
  }
  const html = decode(page.body, page.res);
  const source = (site: string) => ({ label: site, url: page.url.href });

  const found = recipeFromHtml(html, page.url.href, categories);
  if (found) {
    const { site, author, ...recipe } = found;
    return json(200, { recipe: { ...recipe, source: source(author && !site.includes(author) ? `${site} · ${author}` : site) }, via: 'recipe-data' });
  }

  // No recipe data on the page: let the AI read the page text.
  const info = pageText(html, page.url.href);
  if (/<title>\s*(just a moment|attention required|access denied)/i.test(html)) return json(422, { error: BLOCKED, blocked: true });
  if (info.text.length < 200) return json(422, { error: NO_RECIPE });
  return fromText(info.text, `the web page "${info.title}" (${page.url.href})`, categories, { ...source(info.site), image: info.image });
}

/** Reads a recipe out of plain text with the AI reader (same as the photo scan). */
async function fromText(text: string, what: string, categories: string[], from: { label: string; url: string; image: string } | null) {
  const prompt = `This is the text of ${what || 'a recipe copied from a web page'}. If it contains a recipe, transcribe it faithfully: ` +
    'keep the original amounts and wording, leave out ads, comments and the life story, and do not invent anything that is not there. ' +
    `Category list: ${categories.join(', ') || '(none)'}.\n\n${text}`;
  const recipe = await readRecipe([], prompt);
  if (recipe === 'failed') return json(502, { error: 'Couldn’t read the recipe right now. Try again in a minute.' });
  if (!recipe || recipe.found === false) return json(422, { error: from ? NO_RECIPE : 'That text doesn’t look like a recipe.' });
  const { image, ...src } = from ?? { image: '' };
  return json(200, { recipe: { ...recipe, ...(image ? { image } : {}), source: from ? src : { label: 'Pasted recipe' } }, via: 'ai' });
}

export async function GET(req: Request) {
  if (!authorized(req)) return json(401, { error: 'passcode' });
  const url = publicUrl(new URL(req.url).searchParams.get('image') ?? '');
  if (!url) return json(400, { error: 'image' });
  const img = await fetchPublic(url, 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8', MAX_IMAGE);
  const type = 'error' in img ? '' : (img.res.headers.get('content-type') ?? '').split(';')[0].trim();
  if ('error' in img || !/^image\/(jpeg|png|webp|gif|avif)$/.test(type)) return json(422, { error: 'image' });
  return new Response(img.body, { headers: { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}

export const maxDuration = 60;
