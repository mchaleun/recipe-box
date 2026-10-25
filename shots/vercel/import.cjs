// Import from a website: the page fetch is stubbed with what the real
// Food Network page returns, so this runs offline.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const recipe = {
  title: 'Baked Macaroni and Cheese', description: 'Make this Baked Macaroni and Cheese recipe at home with simple ingredients.',
  servings: 6, yieldUnit: '', prepMinutes: 20, cookMinutes: 45, totalMinutes: 0,
  ingredients: ['1/2 pound elbow macaroni', '3 tablespoons butter', '3 tablespoons flour', '1 tablespoon powdered mustard', '3 cups milk', '1/2 cup yellow onion, finely diced', '1 bay leaf', '1/2 teaspoon paprika', '1 large egg', '12 ounces sharp Cheddar, shredded', '1 teaspoon kosher salt', 'Fresh black pepper', '## Topping', '3 tablespoons butter', '1 cup fresh bread crumbs'],
  steps: ['Preheat oven to 350 degrees F.', 'In a large pot of boiling, salted water cook the pasta to al dente.', 'While the pasta is cooking, in a separate pot, melt the butter. Whisk in the flour and mustard and keep it moving for about five minutes.', 'Fold the macaroni into the mix and pour into a 2-quart casserole dish. Top with remaining cheese.', 'Bake for 30 minutes. Remove from oven and rest for five minutes before serving.'],
  notes: '', categories: ['Pasta', 'Side Dishes'], cuisine: 'American', tags: ['macaroni and cheese', 'thanksgiving'],
  image: 'https://food.fnr.sndimg.com/mac.webp', source: { label: 'Food Network · Alton Brown', url: 'https://www.foodnetwork.com/recipes/alton-brown/baked-macaroni-and-cheese-recipe-1939524' },
};
(async () => {
  const b = await chromium.launch(); const url = 'http://localhost:8091/';
  const errs = [];
  for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['ipad', { width: 820, height: 1180 }]]) {
    const c = await b.newContext({ viewport: vp, hasTouch: true });
    await c.addInitScript(() => localStorage.setItem('recipe-box:passcode', 'cinnamon-rolls-1234'));
    const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    let posted;
    await p.route('**/api/import', async (r) => { posted = r.request().postDataJSON(); await new Promise((s) => setTimeout(s, 600)); r.fulfill({ json: { recipe, via: 'recipe-data' } }); });
    await p.route('**/api/import?image=*', (r) => r.fulfill({ body: fs.readFileSync('shots/vercel/photo.jpg'), contentType: 'image/jpeg' }));
    await p.goto(url + '#/edit/new-import-' + name); await p.waitForSelector('.import-card');
    await p.screenshot({ path: `shots/vercel/import-${name}-before.png` });
    await p.fill('#import-url', recipe.source.url);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(150);
    await p.screenshot({ path: `shots/vercel/import-${name}-busy.png` });
    await p.waitForFunction(() => document.querySelector('#ed-title')?.value);
    await p.waitForSelector('.ed-photo-btn img');
    console.log(name, 'sent:', posted.url, '| title:', await p.inputValue('#ed-title'));
    await p.screenshot({ path: `shots/vercel/import-${name}-after.png`, fullPage: true });
    await p.getByRole('button', { name: /^Add/ }).first().click(); await p.waitForTimeout(800);
    console.log(name, 'recipe page:', await p.textContent('h1'), '| source link:', await p.locator('a[href*="foodnetwork"]').count());
    await p.screenshot({ path: `shots/vercel/import-${name}-saved.png` });
  }
  // Blocked site: the error shows in the card.
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  await c.addInitScript(() => localStorage.setItem('recipe-box:passcode', 'cinnamon-rolls-1234'));
  const p = await c.newPage();
  await p.route('**/api/import', (r) => r.fulfill({ status: 422, json: { error: 'This website doesn’t let apps read its recipes. Copy the recipe text from the page and paste it here, or take a screenshot and use Scan a Recipe below.', blocked: true } }));
  await p.goto(url + '#/edit/new-blocked'); await p.waitForSelector('.import-card');
  await p.fill('#import-url', 'https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/'); await p.click('.import-form .btn');
  await p.waitForSelector('.import-error');
  await p.screenshot({ path: 'shots/vercel/import-phone-blocked.png' });
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
