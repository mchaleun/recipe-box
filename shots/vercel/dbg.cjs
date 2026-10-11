const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const url = 'http://localhost:8091/';
  const mk = async () => { const c = await b.newContext(); await c.addInitScript(() => localStorage.setItem('recipe-box:passcode', 'cinnamon-rolls-1234')); return c.newPage(); };
  const ipad = await mk(), phone = await mk();
  const log = [];
  for (const [n,p] of [['ipad',ipad],['phone',phone]]) p.on('request', (r) => r.url().includes('/api/') && log.push(n+' '+r.method()+' '+r.url().replace(url,'')));
  await ipad.goto(url); await ipad.waitForSelector('.count'); await phone.goto(url); await phone.waitForSelector('.count');
  await phone.goto(url + '#/recipe/hot-fudge'); await phone.waitForTimeout(500);
  await phone.click('.heart-btn'); await phone.waitForTimeout(500);
  await phone.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await phone.waitForTimeout(800);
  await ipad.evaluate(() => window.dispatchEvent(new Event('focus'))); await ipad.waitForTimeout(800);
  await ipad.goto(url + '#/favorites'); await ipad.waitForTimeout(600);
  console.log(log.join('\n'));
  console.log('fav titles', await ipad.locator('.card-title').allTextContents());
  await b.close();
})();
