// Reads a photo of a recipe (card, cookbook page, screenshot) and returns the
// recipe as structured fields for the editor to fill in. Uses Vercel AI
// Gateway, authenticated with the project's own OIDC token (no API key).
//
//   POST /api/scan  <- { images: ["data:image/jpeg;base64,...", ...], categories: ["Breads", ...] }
//                   -> { recipe: { title, ingredients: [...], steps: [...], ... } }

import { getVercelOidcToken } from '@vercel/oidc';

const MODEL = 'anthropic/claude-sonnet-5';

function authorized(req: Request) {
  const want = (process.env.FAMILY_PASSCODE ?? '').trim().toLowerCase();
  if (!want) return true;
  return (req.headers.get('x-family-passcode') ?? '').trim().toLowerCase() === want;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const RECIPE_TOOL = {
  name: 'save_recipe',
  description: 'Save the recipe read from the photos.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'False if the photos do not show a recipe.' },
      title: { type: 'string' },
      description: { type: 'string', description: 'One short sentence about the dish, only if the source describes it; otherwise empty.' },
      servings: { type: 'number', description: 'Servings or yield count; 0 if not stated.' },
      yieldUnit: { type: 'string', description: 'What the yield counts if not servings, e.g. "cookies", "loaves", "muffins"; otherwise empty.' },
      prepMinutes: { type: 'number', description: '0 if not stated.' },
      cookMinutes: { type: 'number', description: 'Baking/cooking time in minutes; 0 if not stated.' },
      ingredients: {
        type: 'array',
        items: { type: 'string' },
        description: 'One ingredient per item, exactly as written (amount, unit, ingredient, notes). For a section heading such as "Frosting", use an item starting with "## ".',
      },
      steps: {
        type: 'array',
        items: { type: 'string' },
        description: 'One step per item, without step numbers, in the original wording. Section headings start with "## ".',
      },
      notes: { type: 'string', description: 'Tips, variations, handwritten notes or the recipe\'s origin ("From Grandma"), otherwise empty.' },
      categories: { type: 'array', items: { type: 'string' }, description: 'Matching names from the provided category list only.' },
      cuisine: { type: 'string', description: 'Only if obvious (e.g. Italian, Lao, Mexican); otherwise empty.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Up to 4 short lowercase search words, e.g. main ingredient or occasion.' },
      unreadable: { type: 'string', description: 'Anything that could not be read clearly, so the cook can check it; otherwise empty.' },
    },
    required: ['found', 'title', 'ingredients', 'steps'],
  },
};

export async function POST(req: Request) {
  if (!authorized(req)) return json(401, { error: 'passcode' });
  const body = (await req.json().catch(() => null)) as { images?: string[]; categories?: string[] } | null;
  const images = (body?.images ?? []).slice(0, 4);
  const parsed = images.map((d) => /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(d)).filter((m): m is RegExpExecArray => !!m);
  if (!parsed.length) return json(400, { error: 'Add a photo of the recipe.' });
  const categories = (body?.categories ?? []).filter((c) => typeof c === 'string').slice(0, 60);

  const token = await getVercelOidcToken().catch(() => process.env.AI_GATEWAY_API_KEY ?? '');
  const res = await fetch('https://ai-gateway.vercel.sh/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      tools: [RECIPE_TOOL],
      tool_choice: { type: 'tool', name: 'save_recipe' },
      messages: [{
        role: 'user',
        content: [
          ...parsed.map((m) => ({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } })),
          {
            type: 'text',
            text: `These ${parsed.length > 1 ? `${parsed.length} photos show one recipe (in order)` : 'photo shows a recipe'}, possibly handwritten. ` +
              'Transcribe it faithfully into save_recipe: keep the original amounts and wording, fix only obvious spelling slips, and do not invent anything that is not on the page. ' +
              `Category list: ${categories.join(', ') || '(none)'}.`,
          },
        ],
      }],
    }),
  });
  if (!res.ok) {
    console.error('scan failed', res.status, await res.text().catch(() => ''));
    return json(502, { error: 'Couldn’t read the photo right now. Try again in a minute.' });
  }
  const out = (await res.json()) as { content?: { type: string; input?: Record<string, unknown> }[] };
  const recipe = out.content?.find((c) => c.type === 'tool_use')?.input;
  if (!recipe || recipe.found === false) return json(422, { error: 'That photo doesn’t look like a recipe. Try a closer, brighter photo.' });
  return json(200, { recipe });
}
