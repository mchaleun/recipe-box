const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const url = 'http://localhost:8090/';
  const ipad = await (await b.newContext({ viewport: { width: 1024, height: 768 } })).newPage();
  const phone = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const errs = [];
  for (const p of [ipad, phone]) p.on('pageerror', (e) => errs.push(e.message));
  await ipad.goto(url); await ipad.waitForTimeout(1200);
  console.log('ipad count:', await ipad.textContent('.count'));
  await phone.goto(url); await phone.waitForTimeout(1200);
  // Mom favorites the yellow cake on the iPad...
  await ipad.goto(url + '#/recipe/yellow-cake'); await ipad.waitForTimeout(800);
  await ipad.click('.heart-btn'); await ipad.waitForTimeout(800);
  // ...then opens the phone.
  await phone.evaluate(() => window.dispatchEvent(new Event('focus'))); await phone.waitForTimeout(1000);
  await phone.goto(url + '#/favorites'); await phone.waitForTimeout(800);
  console.log('phone sees yellow cake favorite:', (await phone.locator('.card-title', { hasText: 'Yellow Cake' }).count()) > 0);
  await phone.goto(url + '#/settings'); await phone.waitForTimeout(600);
  console.log('saved on:', await phone.locator('.list-row', { hasText: 'Saved on' }).textContent());
  await phone.goto(url + '#/cook/hot-fudge'); await phone.waitForTimeout(800);
  await phone.tap('.cook-step'); await phone.waitForTimeout(500);
  console.log('cook sub:', await phone.textContent('.cook-title .sub'));
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
