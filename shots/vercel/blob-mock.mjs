// In-memory stand-in for @vercel/blob (private store) used by the local harness.
const store = globalThis.__blobs ??= new Map();
globalThis.__ops ??= { put: 0, get: 0 };
let n = 0;
export async function put(path, body, opts) {
  globalThis.__ops.put++;
  if (store.has(path) && !opts.allowOverwrite) throw new Error('exists');
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body);
  const etag = `"e${++n}"`;
  store.set(path, { bytes, etag, contentType: opts.contentType });
  return { pathname: path, etag, url: 'x' };
}
export async function get(path, opts) {
  globalThis.__ops.get++;
  const b = store.get(path);
  if (!b) return null;
  if (opts.ifNoneMatch && opts.ifNoneMatch === b.etag) return { statusCode: 304, stream: null, blob: { etag: b.etag } };
  return { statusCode: 200, stream: new Blob([b.bytes]).stream(), blob: { etag: b.etag, contentType: b.contentType } };
}
