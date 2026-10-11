const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  // Serve via http so IndexedDB persists across reloads.
  const http = require('http'); const fs = require('fs');
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(fs.readFileSync('dist-preview/index.html')); }).listen(8765);
  await p.goto('http://localhost:8765/');
  await p.waitForTimeout(800);
  // Pretend this browser saved a v1 library with the examples and a user edit.
  await p.evaluate(async () => {
    const snap = await new Promise((res) => { const o = indexedDB.open('recipe-box', 1); o.onsuccess = () => { const g = o.result.transaction('library').objectStore('library').get('snapshot'); g.onsuccess = () => res(g.result); }; });
    delete snap.seedVersion;
    snap.recipes = snap.recipes.filter((r) => ['hot-fudge', 'easy-pizza-sauce'].includes(r.id));
    snap.recipes.push({ ...snap.recipes[0], id: 'lao-beef-larb', title: 'Beef Larb', updatedAt: snap.recipes[0].createdAt });
    snap.recipes.push({ ...snap.recipes[0], id: 'my-own', title: 'My Own Recipe' });
    snap.collections = [{ id: 'weeknight-meals', name: 'Weeknight Meals', recipeIds: ['lao-beef-larb'], createdAt: 1 }];
    await new Promise((res) => { const o = indexedDB.open('recipe-box', 1); o.onsuccess = () => { const t = o.result.transaction('library', 'readwrite'); t.objectStore('library').put(snap, 'snapshot'); t.oncomplete = res; }; });
  });
  await p.reload();
  await p.waitForTimeout(1000);
  console.log(await p.textContent('.count'));
  console.log('has My Own:', await p.locator('text=My Own Recipe').count() > 0, ' has Larb:', await p.locator('text=Beef Larb').count() > 0);
  srv.close(); await b.close();
})();
