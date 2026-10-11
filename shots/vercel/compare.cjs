const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const url = 'http://localhost:8091/';
  const errs = [];
  for (const [name, vp, dark] of [['phone', { width: 390, height: 844 }, false], ['ipad', { width: 1024, height: 1366 }, false], ['phone-dark', { width: 390, height: 844 }, true]]) {
    const c = await b.newContext({ viewport: vp, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
    const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url + '#/recipe/best-chocolate-cake'); await p.waitForTimeout(900);
    if (name === 'phone') {
      await p.getByRole('button', { name: 'Compare with another recipe' }).click(); await p.waitForTimeout(500);
      await p.fill('#compare-search', 'bakery'); await p.waitForTimeout(300);
      await p.screenshot({ path: `shots/vercel/compare-picker.png` });
      await p.locator('.check-row').first().click(); await p.waitForTimeout(800);
      console.log('route:', await p.evaluate(() => location.hash));
    } else {
      await p.goto(url + '#/compare/best-chocolate-cake/bakery-chocolate-cake'); await p.waitForTimeout(900);
    }
    await p.screenshot({ path: `shots/vercel/compare-${name}.png`, fullPage: true });
    const w = await p.evaluate(() => document.documentElement.scrollWidth); console.log(name, 'scrollWidth', w, 'groups', await p.locator('.cmp-group-title').allTextContents());
  }
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
