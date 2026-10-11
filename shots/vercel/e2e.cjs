const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const url = 'http://localhost:8091/';
  const ipad = await (await b.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })).newPage();
  const phone = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const errs = [];
  for (const p of [ipad, phone]) p.on('pageerror', (e) => errs.push(e.message));
  for (const [n,p] of [['ipad',ipad],['phone',phone]]) p.on('request', (r) => r.url().includes('/api/') && console.log(n, r.method(), r.url().replace(url,'')));
  await ipad.goto(url); await ipad.waitForSelector('#passcode');
  await ipad.screenshot({ path: 'shots/vercel/passcode-ipad.png' });
  await ipad.fill('#passcode', 'wrong'); await ipad.click('button[type=submit]'); await ipad.waitForTimeout(400);
  console.log('wrong passcode msg:', await ipad.textContent('[role=alert]'));
  await ipad.fill('#passcode', ' cinnamon-rolls-1234 '); await ipad.click('button[type=submit]');
  await ipad.waitForSelector('.count'); await ipad.waitForTimeout(4000);
  console.log('ipad count:', await ipad.textContent('.count'));
  let ops = await (await fetch(url + '__ops')).json(); console.log('after first load:', JSON.stringify(ops));
  // Reload: remembered passcode, no prompt
  await ipad.reload(); await ipad.waitForSelector('.count');
  console.log('passcode remembered:', (await ipad.locator('#passcode').count()) === 0);
  // Favorite + add a photo on the iPad
  await ipad.goto(url + '#/recipe/yellow-cake'); await ipad.waitForTimeout(600);
  await ipad.click('.heart-btn');
  await ipad.goto(url + '#/edit/yellow-cake'); await ipad.waitForTimeout(600);
  await ipad.setInputFiles('#photo-input', 'shots/vercel/photo.jpg'); await ipad.waitForTimeout(600);
  await ipad.getByRole('button', { name: 'Save Changes' }).click(); await ipad.waitForTimeout(4500);
  ops = await (await fetch(url + '__ops')).json(); console.log('after edits:', JSON.stringify(ops));
  // Phone: enters passcode, sees favorite + photo
  await phone.goto(url); await phone.waitForSelector('#passcode');
  await phone.screenshot({ path: 'shots/vercel/passcode-phone.png' });
  await phone.fill('#passcode', 'Cinnamon-Rolls-1234'); await phone.click('button[type=submit]');
  await phone.waitForSelector('.count'); await phone.waitForTimeout(800);
  await phone.goto(url + '#/favorites'); await phone.waitForTimeout(800);
  console.log('phone sees yellow cake favorite:', (await phone.locator('.card-title', { hasText: 'Yellow Cake' }).count()) > 0);
  await phone.goto(url + '#/recipe/yellow-cake'); await phone.waitForTimeout(1000);
  const src = await phone.locator('img').first().getAttribute('src').catch(() => null);
  const loaded = await phone.locator('img').first().evaluate((i) => i.naturalWidth).catch(() => 0);
  console.log('phone photo:', src, 'width', loaded);
  await phone.screenshot({ path: 'shots/vercel/recipe-phone.png' });
  // Phone changes something; iPad picks it up on focus
  await phone.goto(url + '#/recipe/hot-fudge'); await phone.waitForTimeout(500);
  await phone.click('.heart-btn'); await phone.waitForTimeout(500);
  await phone.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await phone.waitForTimeout(800);
  await ipad.evaluate(() => window.dispatchEvent(new Event('focus'))); await ipad.waitForTimeout(800);
  await ipad.goto(url + '#/favorites'); await ipad.waitForTimeout(600);
  console.log('ipad sees hot fudge (saved on app close):', (await ipad.locator('.card-title', { hasText: 'Hot Fudge' }).count()) > 0);
  await ipad.goto(url + '#/settings'); await ipad.waitForTimeout(500);
  console.log('saved on:', await ipad.locator('.list-row', { hasText: 'Saved on' }).textContent());
  ops = await (await fetch(url + '__ops')).json(); console.log('final ops:', JSON.stringify(ops));
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
