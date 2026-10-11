const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('file://' + path.resolve('dist-preview/index.html'));
  await p.waitForTimeout(500);
  await p.click('.pill-btn');
  await p.waitForTimeout(800);
  console.log(await p.evaluate(() => { const e = document.elementFromPoint(60, 25); return e.className + ' / ' + e.closest('.sheet-root, .topbar')?.className; }));
  await p.screenshot({ path: 'shots/probe.png' });
  await b.close();
})();
