// Serves dist/ and the api/ functions like Vercel does, for local testing.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const fns = {
  '/api/library': await import('./out/library.mjs'),
  '/api/photo': await import('./out/photo.mjs'),
  '/api/health': await import('./out/health.mjs'),
};
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8091');
  const fn = fns[url.pathname];
  if (fn) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const out = await fn[req.method](r);
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
    return;
  }
  if (url.pathname === '/__ops') { res.end(JSON.stringify({ ...globalThis.__ops, keys: [...(globalThis.__blobs?.keys() ?? [])] })); return; }
  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  try { const b = await readFile(join('dist', file)); res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(8091, () => console.log('ready'));
