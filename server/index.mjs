// Recipe Box home server.
//
// Serves the built app (dist/) and keeps the whole recipe library in one JSON
// file, so every phone, iPad and laptop on the home Wi-Fi sees the same
// recipes. No dependencies beyond Node 18+.
//
//   PORT=80 DATA_DIR=/var/lib/recipe-box node server/index.mjs
//
// API
//   GET /api/library[?since=rev] -> { revision, savedAt, snapshot } (or { unchanged }) or 404 when empty
//   PUT /api/library  <- { snapshot } -> { revision, savedAt }
//   GET /api/backup   -> the library file as a download

import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = process.env.DIST_DIR ?? join(ROOT, 'dist');
const DATA = process.env.DATA_DIR ?? join(ROOT, 'data');
const PORT = Number(process.env.PORT ?? 8080);
const LIBRARY = join(DATA, 'library.json');
const BACKUPS = join(DATA, 'backups');
const KEEP_BACKUPS = 60;
const MAX_BODY = 50 * 1024 * 1024; // photos are stored inline, so allow room

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain',
};

await mkdir(BACKUPS, { recursive: true });

async function readLibrary() {
  try { return JSON.parse(await readFile(LIBRARY, 'utf8')); } catch { return null; }
}

// One backup per day (the first save of the day keeps the previous version).
async function backupIfNeeded() {
  const day = new Date().toISOString().slice(0, 10);
  const target = join(BACKUPS, `library-${day}.json`);
  try { await stat(target); return; } catch { /* no backup yet today */ }
  try { await writeFile(target, await readFile(LIBRARY)); } catch { return; }
  const files = (await readdir(BACKUPS)).filter((f) => f.endsWith('.json')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))) await rm(join(BACKUPS, f));
}

// Saves are serialized and written atomically so a power cut can't corrupt the file.
let queue = Promise.resolve();
function saveLibrary(snapshot) {
  const run = queue.then(async () => {
    const current = await readLibrary();
    if (current) await backupIfNeeded();
    const doc = { revision: (current?.revision ?? 0) + 1, savedAt: new Date().toISOString(), snapshot };
    const tmp = `${LIBRARY}.tmp`;
    await writeFile(tmp, JSON.stringify(doc));
    await rename(tmp, LIBRARY);
    return doc;
  });
  queue = run.catch(() => {});
  return run;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'cache-control': 'no-store', ...headers });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { 'content-type': 'application/json' });

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Library is too large to save.'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function serveStatic(req, res) {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(DIST, path));
  if (!file.startsWith(DIST)) return send(res, 403, 'Forbidden');
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(DIST, 'index.html'); // app routes use #hash, but be forgiving
  }
  try {
    const s = await stat(file);
    const hashed = /\/assets\//.test(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'content-length': s.size,
      'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    createReadStream(file).pipe(res);
  } catch {
    send(res, 404, 'The app hasn’t been built yet. Run: npm run build');
  }
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');
    if (pathname === '/api/library' && req.method === 'GET') {
      const doc = await readLibrary();
      if (!doc) return json(res, 404, { error: 'empty' });
      const since = new URL(req.url, 'http://x').searchParams.get('since');
      return since === String(doc.revision) ? json(res, 200, { revision: doc.revision, unchanged: true }) : json(res, 200, doc);
    }
    if (pathname === '/api/library' && req.method === 'PUT') {
      const body = JSON.parse(await readBody(req));
      const snap = body?.snapshot;
      if (snap?.version !== 1 || !Array.isArray(snap.recipes) || !Array.isArray(snap.categories)) {
        return json(res, 400, { error: 'That isn’t a Recipe Box library.' });
      }
      const doc = await saveLibrary(snap);
      return json(res, 200, { revision: doc.revision, savedAt: doc.savedAt });
    }
    if (pathname === '/api/backup' && req.method === 'GET') {
      const doc = await readLibrary();
      if (!doc) return json(res, 404, { error: 'empty' });
      return send(res, 200, JSON.stringify(doc.snapshot, null, 2), {
        'content-type': 'application/json',
        'content-disposition': `attachment; filename="recipe-box-${doc.savedAt.slice(0, 10)}.json"`,
      });
    }
    if (pathname === '/api/health') return json(res, 200, { ok: true });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    return serveStatic(req, res);
  } catch (err) {
    console.error(err);
    return json(res, err.status ?? 500, { error: err.status ? err.message : 'Something went wrong saving recipes.' });
  }
});

server.listen(PORT, () => {
  console.log(`Recipe Box is running on port ${PORT}`);
  console.log(`  App:  ${DIST}`);
  console.log(`  Data: ${LIBRARY}`);
});
