const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const url = 'http://localhost:8091/';
  const errs = [];
  for (const [name, vp, dark] of [['phone', { width: 390, height: 844 }, false], ['ipad', { width: 1024, height: 1366 }, false], ['phone-dark', { width: 390, height: 844 }, true]]) {
    const c = await b.newContext({ viewport: vp, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
    const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(1200);
    if (name === 'phone') {
      const cards = await p.locator('.grid .card-title').allTextContents();
      console.log('grid cards', cards.length, cards.filter((t) => /Cookies|Cake|Pumpkin|Pecans/.test(t)));
      console.log('badges', await p.locator('.grid .card-versions').allTextContents());
      await p.fill('#library-search', 'chocolate chip cookies'); await p.waitForTimeout(400);
      console.log('search', await p.locator('.grid .card-title').allTextContents());
      await p.screenshot({ path: 'shots/vercel/versions-search-phone.png' });
    }
    await p.goto(url + '#/recipe/molasses-cookies'); await p.waitForTimeout(900);
    console.log(name, 'chips', await p.locator('.versions-chips .chip').allTextContents(), 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth));
    await p.screenshot({ path: `shots/vercel/versions-${name}.png` });
    if (name === 'phone') {
      await p.locator('.versions-chips .chip', { hasText: 'Preppy Kitchen' }).click(); await p.waitForTimeout(600);
      console.log('after tap', await p.evaluate(() => location.hash), await p.textContent('.recipe-title'));
      await p.getByRole('button', { name: 'Compare Versions' }).click(); await p.waitForTimeout(500);
      console.log('picker rows', await p.locator('.sheet .check-row .title').allTextContents());
      await p.screenshot({ path: 'shots/vercel/versions-picker-phone.png' });
      await p.locator('.check-row', { hasText: 'King Arthur' }).click(); await p.waitForTimeout(800);
      console.log('compare route', await p.evaluate(() => location.hash));
      await p.screenshot({ path: 'shots/vercel/versions-compare-phone.png', fullPage: true });
    }
  }
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
