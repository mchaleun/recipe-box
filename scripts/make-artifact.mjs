// Turns the single-file preview build into a page fragment for sharing as a
// hosted preview (the host supplies <html>/<head>/<body> itself).
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-preview/index.html', 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]).join('\n');
const title = pick(/<title>[\s\S]*?<\/title>/g);
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = [...html.matchAll(/<script type="module"[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => `<script type="module">${m[1]}</script>`).join('\n');
writeFileSync('dist-preview/recipe-box.html', `${title}\n${styles}\n<div id="root"></div>\n${scripts}\n`);
console.log('wrote dist-preview/recipe-box.html');
