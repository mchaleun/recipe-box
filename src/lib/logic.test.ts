import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleIngredient, formatAmount, parseLeadingAmount } from './quantity';
import { parseQuery, searchRecipes } from './search';
import { detectTimers } from './time';
import { seedRecipes, seedCategories, seedCollections, seedSnapshot } from '../data/seed';
import { upgradeSeed } from '../data/upgrade';
import { oneCardPerDish, versionLabel, versionsOf } from './versions';

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
  assert.ok(titles('pumpkin').includes('Pumpkin Roll (Libby’s)'));
  assert.ok(titles('sourdough').includes('Sourdough Bread'));
  assert.ok(titles('beef recipes').includes('Smoked Brisket'));
  assert.ok(titles('chocolate cake').includes('Chocolate Cake (The Best Ever)'));
  assert.ok(!titles('under 30 minutes').includes('Smoked Brisket'));
  assert.ok(titles('under 30 minutes').includes('Small-Batch Hot Fudge'));
  assert.equal(titles('chocolate chip cookies').filter((t) => t.startsWith('Chocolate Chip Cookies')).length, 4);
  assert.ok(titles('molasses').includes('Molasses Cookies (Preppy Kitchen)'));
  assert.ok(titles('kahlua').includes('French Chocolate Mousse'));
  assert.ok(titles('mascarpone').includes('Berry Chantilly Cake (Cakes by MK)'));
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

test('comparison sheets become versions of one dish', () => {
  const molasses = seedRecipes.find((r) => r.id === 'molasses-cookies')!;
  assert.deepEqual(versionsOf(seedRecipes, molasses).map(versionLabel).sort(), ['ChatGPT', 'ChatGPT Chewy', 'King Arthur', 'Preppy Kitchen']);
  const chip = seedRecipes.filter((r) => r.family === 'chocolate-chip-cookies').map((r) => r.title);
  assert.ok(chip.includes('Chocolate Chip Cookies (Hershey’s)') && chip.length === 4);
  const cards = oneCardPerDish(seedRecipes, seedRecipes);
  assert.equal(cards.filter((c) => c.recipe.family === 'molasses-cookies').length, 1);
  assert.equal(cards.find((c) => c.recipe.family === 'molasses-cookies')!.versions, 4);
  for (const r of seedRecipes.filter((x) => x.family)) assert.ok(r.version, `${r.id} has a version label`);
});

test('upgrading an older library adds versions and keeps edits', () => {
  const old = seedSnapshot();
  old.seedVersion = 2;
  old.recipes = old.recipes.filter((r) => !r.family || r.id === r.family || ['best-chocolate-cake', 'fluffy-butter-chocolate-cake', 'bakery-chocolate-cake'].includes(r.id))
    .map(({ family, version, ...r }) => r);
  const edited = old.recipes.find((r) => r.id === 'pumpkin-roll')!;
  Object.assign(edited, { title: 'Mom’s Pumpkin Roll', updatedAt: edited.createdAt + 5000 });
  const viewed = old.recipes.find((r) => r.id === 'molasses-cookies')!;
  Object.assign(viewed, { title: 'Chewy Molasses Cookies', favorite: true, viewCount: 3 });
  const up = upgradeSeed(old);
  const byId = (id: string) => up.recipes.find((r) => r.id === id)!;
  assert.equal(up.recipes.length, seedRecipes.length);
  assert.equal(byId('pumpkin-roll').title, 'Mom’s Pumpkin Roll');
  assert.equal(byId('pumpkin-roll').family, 'pumpkin-roll');
  assert.equal(byId('molasses-cookies').title, 'Molasses Cookies (ChatGPT Chewy)');
  assert.ok(byId('molasses-cookies').favorite && byId('molasses-cookies').viewCount === 3);
  assert.ok(byId('chocolate-chip-cookies-hersheys'));
});

test('imports a recipe from a web page’s recipe data', async () => {
  const { recipeFromHtml, isoMinutes, parseYield, pageText } = await import('../../api/_recipePage');
  assert.equal(isoMinutes('PT1H30M'), 90);
  assert.equal(isoMinutes('P0DT0H45M'), 45);
  assert.equal(isoMinutes('P0Y0M0DT1H5M0.000S'), 65);
  assert.deepEqual(parseYield(['24', '24 cookies']), { servings: 24, yieldUnit: 'cookies' });
  assert.deepEqual(parseYield('6 to 8 servings'), { servings: 6, yieldUnit: '' });
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: 'ignored' },
      {
        '@type': ['Recipe'], name: 'Perfect Pot Roast', description: '<p>Ree&#39;s Sunday classic &amp; more.</p>',
        image: [{ '@type': 'ImageObject', url: '/small.jpg', width: 300 }, { '@type': 'ImageObject', url: '/big.jpg', width: 1200 }],
        author: [{ '@type': 'Person', name: 'Ree Drummond' }], recipeYield: '6 servings',
        prepTime: 'PT20M', cookTime: 'PT3H', totalTime: 'PT3H20M', recipeCategory: ['Main Dish', 'Beef'], recipeCuisine: 'American',
        keywords: 'pot roast, beef, comfort food',
        recipeIngredient: ['1 whole (3 to 5 pounds) chuck roast', '2 cups beef broth', '1 &frac12; cups red wine'],
        recipeInstructions: [
          { '@type': 'HowToSection', name: 'For the roast', itemListElement: [
            { '@type': 'HowToStep', text: 'Preheat the oven to 275&deg;F.' },
            { '@type': 'HowToStep', text: 'Sear the meat.<br>Turn it over.' },
          ] },
          'Serve with potatoes.',
        ],
      },
    ],
  };
  const html = `<html><head><meta property="og:site_name" content="Food Network"><script type="application/ld+json">${JSON.stringify(ld)}</script></head></html>`;
  const r = recipeFromHtml(html, 'https://www.foodnetwork.com/recipes/pot-roast', seedCategories.map((c) => c.name))!;
  assert.equal(r.title, 'Perfect Pot Roast');
  assert.equal(r.description, 'Ree\'s Sunday classic & more.');
  assert.equal(r.servings, 6);
  assert.equal(r.prepMinutes, 20);
  assert.equal(r.cookMinutes, 180);
  assert.equal(r.totalMinutes, 0);
  assert.equal(r.ingredients[2], '1 ½ cups red wine');
  assert.deepEqual(r.steps, ['## For the roast', 'Preheat the oven to 275°F.', 'Sear the meat.', 'Turn it over.', 'Serve with potatoes.']);
  assert.deepEqual(r.categories, ['Beef']);
  assert.equal(r.cuisine, 'American');
  assert.equal(r.image, 'https://www.foodnetwork.com/big.jpg');
  assert.equal(r.site, 'Food Network');
  assert.equal(r.author, 'Ree Drummond');
  assert.equal(recipeFromHtml('<html><body>No recipe here</body></html>', 'https://example.com/'), null);
  assert.match(pageText('<html><head><title>Soup</title></head><body><nav>Menu</nav><p>Boil water.</p></body></html>', 'https://example.com/').text, /^Boil water\.$/);
});
