// Reads a recipe with an AI model and returns it as editor fields. Shared by
// api/scan (photos) and api/import (web pages without recipe data).
//
// Uses Google Gemini when GEMINI_API_KEY is set (free tier, no card needed),
// otherwise Vercel AI Gateway with the project's OIDC token (needs a card on
// the Vercel account to unlock its free credits).

import { getVercelOidcToken } from '@vercel/oidc';

const MODEL = 'anthropic/claude-sonnet-5';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const RECIPE_TOOL = {
  name: 'save_recipe',
  description: 'Save the recipe that was read.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'False if there is no recipe.' },
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

export type Image = { type: string; data: string };
export type Fields = Record<string, unknown> | undefined | 'failed';

/** Reads the recipe in the photos and/or text; 'failed' when the model couldn't be reached. */
export function readRecipe(images: Image[], prompt: string): Promise<Fields> {
  return process.env.GEMINI_API_KEY ? readWithGemini(images, prompt) : readWithGateway(images, prompt);
}

async function readWithGateway(images: Image[], prompt: string): Promise<Fields> {
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
          ...images.map((i) => ({ type: 'image', source: { type: 'base64', media_type: i.type, data: i.data } })),
          { type: 'text', text: `${prompt} Answer with save_recipe.` },
        ],
      }],
    }),
  });
  if (!res.ok) {
    console.error('recipe read failed (gateway)', res.status, await res.text().catch(() => ''));
    return 'failed';
  }
  const out = (await res.json()) as { content?: { type: string; input?: Record<string, unknown> }[] };
  return out.content?.find((c) => c.type === 'tool_use')?.input;
}

/** Gemini takes an OpenAPI-style schema with upper-case type names. */
function geminiSchema(s: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { type: String(s.type).toUpperCase() };
  if (s.description) out.description = s.description;
  if (s.items) out.items = geminiSchema(s.items as Record<string, unknown>);
  if (s.properties) out.properties = Object.fromEntries(Object.entries(s.properties as Record<string, Record<string, unknown>>).map(([k, v]) => [k, geminiSchema(v)]));
  if (s.required) out.required = s.required;
  return out;
}

// Google's free tier is sometimes busy (503) or rate-limited (429), and retires
// model versions (404); try the next Flash model before giving up.
const GEMINI_FALLBACKS = ['gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest'];

async function readWithGemini(images: Image[], prompt: string): Promise<Fields> {
  const models = [...new Set([GEMINI_MODEL, ...GEMINI_FALLBACKS])];
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY ?? '' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [...images.map((i) => ({ inline_data: { mime_type: i.type, data: i.data } })), { text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: geminiSchema(RECIPE_TOOL.input_schema), temperature: 0 },
      }),
    });
    if (!res.ok) {
      console.error(`recipe read failed (gemini ${model})`, res.status, await res.text().catch(() => ''));
      if ([404, 429, 500, 503].includes(res.status)) continue;
      return 'failed';
    }
    const out = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = out.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try { return JSON.parse(text) as Record<string, unknown>; } catch { return 'failed'; }
  }
  return 'failed';
}
