// Recipe photos, stored separately from the library so it stays small.
//   GET /api/photo?id=<hash>  -> the image (cached for a year; ids are content hashes)
//   PUT /api/photo?id=<hash>  <- image bytes (needs the family passcode)

import { get, put } from '@vercel/blob';

const ID = /^[a-f0-9]{16,64}$/;

function authorized(req: Request) {
  const want = (process.env.FAMILY_PASSCODE ?? '').trim().toLowerCase();
  if (!want) return true;
  return (req.headers.get('x-family-passcode') ?? '').trim().toLowerCase() === want;
}

function photoPath(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  return ID.test(id) ? `photos/${id}` : null;
}

export async function GET(req: Request) {
  const path = photoPath(req);
  if (!path) return new Response('Not found', { status: 404 });
  const res = await get(path, { access: 'private' });
  if (!res || res.statusCode !== 200 || !res.stream) return new Response('Not found', { status: 404 });
  return new Response(res.stream, {
    headers: {
      'content-type': res.blob.contentType ?? 'image/jpeg',
      'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
}

export async function PUT(req: Request) {
  if (!authorized(req)) return new Response('Passcode needed', { status: 401 });
  const path = photoPath(req);
  const type = req.headers.get('content-type') ?? '';
  if (!path || !/^image\/(jpeg|png|webp|gif)$/.test(type)) return new Response('Bad photo', { status: 400 });
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > 4 * 1024 * 1024) return new Response('Photo is too large', { status: 413 });
  await put(path, bytes, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: type });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
}
