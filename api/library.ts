// Online library storage (Vercel Function + private Vercel Blob store).
// Same JSON shape as the home server in server/index.mjs, so the app works
// with either.
//
//   GET /api/library[?since=rev] -> { revision, savedAt, snapshot } (or { unchanged }) or 404
//   PUT /api/library  <- { snapshot } -> { revision, savedAt }
//
// Every request needs the x-family-passcode header to match FAMILY_PASSCODE.

import { get, put } from '@vercel/blob';

const LIBRARY = 'library/library.json';

function authorized(req: Request) {
  const want = (process.env.FAMILY_PASSCODE ?? '').trim().toLowerCase();
  if (!want) return true;
  return (req.headers.get('x-family-passcode') ?? '').trim().toLowerCase() === want;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

interface Doc { savedAt: string; snapshot: unknown }

async function read() {
  const res = await get(LIBRARY, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  return { etag: res.blob.etag, doc: (await new Response(res.stream).json()) as Doc };
}

export async function GET(req: Request) {
  if (!authorized(req)) return json(401, { error: 'passcode' });
  const since = new URL(req.url).searchParams.get('since');
  if (since === 'check') return json(200, { ok: true });
  // A conditional read skips downloading the library when nothing changed.
  const res = await get(LIBRARY, { access: 'private', useCache: false, ifNoneMatch: since || undefined });
  if (!res) return json(404, { error: 'empty' });
  if (res.statusCode === 304 || !res.stream) return json(200, { revision: since, unchanged: true });
  const doc = (await new Response(res.stream).json()) as Doc;
  return json(200, { revision: res.blob.etag, savedAt: doc.savedAt, snapshot: doc.snapshot });
}

export async function PUT(req: Request) {
  if (!authorized(req)) return json(401, { error: 'passcode' });
  const body = (await req.json().catch(() => null)) as { snapshot?: { version?: number; recipes?: unknown; categories?: unknown } } | null;
  const snap = body?.snapshot;
  if (snap?.version !== 1 || !Array.isArray(snap.recipes) || !Array.isArray(snap.categories)) {
    return json(400, { error: 'That isn’t a Recipe Box library.' });
  }
  // Keep the last version of each earlier day as a backup.
  const today = new Date().toISOString().slice(0, 10);
  const current = await read().catch(() => null);
  const day = current?.doc.savedAt?.slice(0, 10);
  if (current && day && day !== today) {
    await put(`backups/library-${day}.json`, JSON.stringify(current.doc), {
      access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
    }).catch(() => {});
  }
  const savedAt = new Date().toISOString();
  const blob = await put(LIBRARY, JSON.stringify({ savedAt, snapshot: snap }), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60,
  });
  return json(200, { revision: blob.etag, savedAt });
}
