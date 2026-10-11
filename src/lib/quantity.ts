// Parsing and scaling of ingredient quantities written the way people write them:
// "1 1/2 cups", "1½ cups", "½ cup + 2 Tbsp", "2-3 cloves", "300 grams", "1.5 lb".

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4,
  '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5, '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};
const FRAC_CHARS = Object.keys(UNICODE_FRACTIONS).join('');

// A single number: "1 1/2", "1½", "1/2", "½", "1.5", "2".
const NUMBER = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\s*[${FRAC_CHARS}]|\\d+\\/\\d+|[${FRAC_CHARS}]|\\d+(?:\\.\\d+)?|\\.\\d+)`;
// A number or a range: "2-3", "2 to 3", "2–3".
const AMOUNT = new RegExp(`^(${NUMBER})(?:\\s*(?:-|–|—|to)\\s*(${NUMBER}))?`, 'i');

const METRIC_UNITS = /^(g|gr|gram|grams|kg|kilograms?|ml|mL|milliliters?|millilitres?|l|liters?|litres?|cl|dl|oz|ounces?)\b/i;

export function parseNumber(raw: string): number | undefined {
  const s = raw.trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return +m[1] + +m[2] / +m[3];
  m = s.match(new RegExp(`^(\\d+)\\s*([${FRAC_CHARS}])$`));
  if (m) return +m[1] + UNICODE_FRACTIONS[m[2]];
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return +m[2] === 0 ? undefined : +m[1] / +m[2];
  if (s in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[s];
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export interface ParsedAmount {
  value: number;
  max?: number;
  /** Text after the amount, e.g. " cups flour". */
  rest: string;
  metric: boolean;
}

export function parseLeadingAmount(text: string): ParsedAmount | undefined {
  const m = text.match(AMOUNT);
  if (!m) return undefined;
  const value = parseNumber(m[1]);
  if (value === undefined) return undefined;
  const max = m[2] ? parseNumber(m[2]) : undefined;
  const rest = text.slice(m[0].length);
  return { value, max, rest, metric: METRIC_UNITS.test(rest.trim()) };
}

const NICE_FRACTIONS: [number, string][] = [
  [0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'],
  [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, ''],
];

/** Formats a quantity for reading in a kitchen: fractions for cups and spoons,
 *  whole numbers or one decimal for grams and millilitres. */
export function formatAmount(n: number, metric = false): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (metric) {
    if (n >= 10) return String(Math.round(n));
    return String(Math.round(n * 10) / 10);
  }
  if (n >= 20) return String(Math.round(n));
  let whole = Math.floor(n);
  const frac = n - whole;
  let best = NICE_FRACTIONS[0];
  for (const f of NICE_FRACTIONS) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  if (best[0] === 1) { whole += 1; best = NICE_FRACTIONS[0]; }
  if (whole === 0 && !best[1]) return '⅛';
  if (whole === 0) return best[1];
  return `${whole}${best[1]}`;
}

export interface ScaledLine {
  /** Bold, scaled amount at the start of the line (empty if none). */
  amount: string;
  /** Remainder of the line, with any "+ 2 Tbsp" style add-ons also scaled. */
  rest: string;
  scaled: boolean;
}

/** Scales the quantities in one ingredient line by `factor`. */
export function scaleIngredient(text: string, factor: number): ScaledLine {
  const parsed = parseLeadingAmount(text);
  if (!parsed) return { amount: '', rest: text, scaled: false };
  const fmt = (v: number) => formatAmount(v * factor, parsed.metric);
  const amount = parsed.max !== undefined ? `${fmt(parsed.value)}–${fmt(parsed.max)}` : fmt(parsed.value);
  // Scale secondary amounts joined with "+" ("½ cup + 2 Tbsp flour").
  const rest = parsed.rest.replace(new RegExp(`(\\+\\s*)(${NUMBER})`, 'g'), (_m, plus: string, num: string) => {
    const v = parseNumber(num);
    return v === undefined ? _m : `${plus}${formatAmount(v * factor, parsed.metric)}`;
  });
  return { amount, rest, scaled: factor !== 1 };
}
