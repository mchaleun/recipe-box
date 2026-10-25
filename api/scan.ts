// Reads a photo of a recipe (card, cookbook page, screenshot) and returns the
// recipe as structured fields for the editor to fill in.
//
// The model is chosen in api/_ai.ts (Gemini free tier or Vercel AI Gateway).
//
//   POST /api/scan  <- { images: ["data:image/jpeg;base64,...", ...], categories: ["Breads", ...] }
//                   -> { recipe: { title, ingredients: [...], steps: [...], ... } }

import { readRecipe } from './_ai';

function authorized(req: Request) {
  const want = (process.env.FAMILY_PASSCODE ?? '').trim().toLowerCase();
  if (!want) return true;
  return (req.headers.get('x-family-passcode') ?? '').trim().toLowerCase() === want;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(req: Request) {
  if (!authorized(req)) return json(401, { error: 'passcode' });
  const body = (await req.json().catch(() => null)) as { images?: string[]; categories?: string[] } | null;
  const images = (body?.images ?? []).slice(0, 4);
  const parsed = images.map((d) => /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(d)).filter((m): m is RegExpExecArray => !!m);
  if (!parsed.length) return json(400, { error: 'Add a photo of the recipe.' });
  const categories = (body?.categories ?? []).filter((c) => typeof c === 'string').slice(0, 60);

  const prompt = `These ${parsed.length > 1 ? `${parsed.length} photos show one recipe (in order)` : 'photo shows a recipe'}, possibly handwritten. ` +
    'Transcribe it faithfully: keep the original amounts and wording, fix only obvious spelling slips, and do not invent anything that is not on the page. ' +
    `Category list: ${categories.join(', ') || '(none)'}.`;
  const photos = parsed.map((m) => ({ type: m[1], data: m[2] }));
  const recipe = await readRecipe(photos, prompt);
  if (recipe === 'failed') return json(502, { error: 'Couldn’t read the photo right now. Try again in a minute.' });
  if (!recipe || recipe.found === false) return json(422, { error: 'That photo doesn’t look like a recipe. Try a closer, brighter photo.' });
  return json(200, { recipe });
}

export const maxDuration = 60;
