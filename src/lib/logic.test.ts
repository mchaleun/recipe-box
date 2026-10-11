import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleIngredient, formatAmount, parseLeadingAmount } from './quantity';
import { parseQuery, searchRecipes } from './search';
import { detectTimers } from './time';
import { seedRecipes, seedCategories, seedCollections } from '../data/seed';

test('formats amounts', () => {
  assert.equal(formatAmount(1.5), '1½');
  assert.equal(formatAmount(0.333), '⅓');
  assert.equal(formatAmount(2.98), '3');
  assert.equal(formatAmount(612.5, true), '613');
});

test('scales ingredient lines', () => {
  assert.deepEqual(scaleIngredient('1 1/2 cups flour', 2), { amount: '3', rest: ' cups flour', scaled: true });
  assert.equal(scaleIngredient('½ cup + 2 Tbsp flour', 2).rest, ' cup + 4 Tbsp flour');
  assert.equal(scaleIngredient('½ cup + 2 Tbsp flour', 2).amount, '1');
  assert.equal(scaleIngredient('2-3 cloves garlic', 2).amount, '4–6');
  assert.equal(scaleIngredient('300 g flour', 1.5).amount, '450');
  assert.equal(scaleIngredient('1 28-ounce jar tomatoes', 2).amount, '2');
  assert.equal(scaleIngredient('Zest of 1 orange', 2).amount, '');
  assert.equal(parseLeadingAmount('5 g honey')?.metric, true);
});

test('parses natural queries', () => {
  assert.deepEqual(parseQuery('recipes with chicken and rice').terms, ['chicken', 'rice']);
  assert.equal(parseQuery('under 30 minutes').maxMinutes, 30);
  assert.equal(parseQuery('under 1 hour').maxMinutes, 60);
});

test('searches the library', () => {
  const titles = (q: string) => searchRecipes(seedRecipes, seedCategories, q).map((r) => r.title);
  assert.ok(titles('pumpkin').includes('Pumpkin Roll'));
  assert.ok(titles('sourdough').includes('Sourdough Bread'));
  assert.ok(titles('beef recipes').includes('Smoked Brisket'));
  assert.ok(titles('chocolate cake').includes('The Best Chocolate Cake'));
  assert.ok(!titles('under 30 minutes').includes('Smoked Brisket'));
  assert.ok(titles('under 30 minutes').includes('Small-Batch Hot Fudge'));
  assert.ok(titles('kahlua').includes('French Chocolate Mousse'));
  assert.ok(titles('mascarpone').includes('Berry Chantilly Cake'));
});

test('library has unique ids and every collection points at real recipes', () => {
  const ids = seedRecipes.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of seedCollections) for (const id of c.recipeIds) assert.ok(ids.includes(id), `${c.name}: ${id}`);
  for (const r of seedRecipes) for (const c of r.categoryIds) assert.ok(seedCategories.some((x) => x.id === c), `${r.title}: ${c}`);
  for (const r of seedRecipes) assert.ok(r.ingredients.length && r.steps.length, r.title);
});

test('detects timers in steps', () => {
  assert.deepEqual(detectTimers('Simmer 3 to 5 minutes, until thick.').map((t) => t.seconds), [180]);
  assert.deepEqual(detectTimers('Rest 1 hour, then refrigerate 16–24 hours.').map((t) => t.seconds), [3600, 57600]);
});

test('compare lines up matching ingredients', async () => {
  const { matchIngredients } = await import('./compare');
  const mk = (a: string[]) => a.map((text, i) => ({ id: String(i), text }));
  const [both, onlyA, onlyB] = matchIngredients(
    mk(['¾ cup granulated sugar', '¾ cup packed brown sugar', '1 tsp baking soda', '2 large eggs']),
    mk(['1 cup brown sugar', '1 tsp baking powder', '1 egg + 1 yolk']),
  );
  assert.deepEqual(both.map((r) => [r.a?.text, r.b?.text]), [['¾ cup packed brown sugar', '1 cup brown sugar'], ['2 large eggs', '1 egg + 1 yolk']]);
  assert.deepEqual(onlyA.map((r) => r.a?.text), ['¾ cup granulated sugar', '1 tsp baking soda']);
  assert.deepEqual(onlyB.map((r) => r.b?.text), ['1 tsp baking powder']);
});
