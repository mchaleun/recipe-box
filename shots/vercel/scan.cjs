const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const url = 'http://localhost:8091/';
  const errs = [];
  for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['ipad', { width: 820, height: 1180 }]]) {
    const c = await b.newContext({ viewport: vp, hasTouch: true });
    await c.addInitScript(() => localStorage.setItem('recipe-box:passcode', 'cinnamon-rolls-1234'));
    const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url + '#/edit/new-scan-' + name); await p.waitForSelector('.scan-card');
    await p.screenshot({ path: `shots/vercel/scan-${name}-before.png` });
    await p.setInputFiles('#scan-input', ['shots/vercel/photo.jpg', 'shots/vercel/photo.jpg']);
    await p.waitForFunction(() => document.querySelector('#ed-title')?.value);
    await p.waitForTimeout(400);
    console.log(name, 'title:', await p.inputValue('#ed-title'), '| note:', await p.textContent('.scan-note'));
    await p.screenshot({ path: `shots/vercel/scan-${name}-after.png`, fullPage: true });
    await p.getByRole('button', { name: 'Add Recipe' }).click(); await p.waitForTimeout(800);
    console.log(name, 'recipe page:', await p.textContent('h1'), '| ingredient lines:', await p.locator('.ing-line, .checklist li').count());
  }
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
