# Recipe Box

The family recipe app: one place to browse, search, cook from, and edit every recipe
that currently lives in Excel, Word and PDF files.

## Run it

```sh
npm install
npm run dev            # local dev server
npm test               # quantity scaling, search and timer tests
npm run build          # static site in dist/ (deploy to any static host)
npm run build:preview  # single-file preview in dist-preview/
```

## How it is put together

React 19 + TypeScript + Vite, no UI framework. Plain CSS with design tokens
(`src/styles.css`, `src/recipe.css`), light and dark themes.

| Path | What it does |
|---|---|
| `src/types.ts` | Data model: Recipe, Category, Collection, cooking progress |
| `src/data/repository.ts` | Storage: shared library over HTTP (online or home server), else IndexedDB in the browser |
| `src/data/seed.ts` | The 36 family recipes imported from the Drive folder (bump `SEED_VERSION` when changing) |
| `src/screens/Passcode.tsx` | Family passcode screen (online only; each device remembers it) |
| `api/` | Vercel Functions: `library` (the shared library), `photo` (recipe photos), `health` |
| `server/index.mjs` | Alternative: a tiny home server that keeps the library in a JSON file |
| `src/store.tsx` | All state changes (reducer) and autosave |
| `src/lib/quantity.ts` | Parses "1 ½ cups", "½ cup + 2 Tbsp", "2–3", "300 g" and scales them |
| `src/lib/search.ts` | Natural search ("chicken and rice", "Lao", "under 30 minutes"), filters, sorting |
| `src/lib/time.ts` | Time formatting and timer detection in steps |
| `src/screens/` | Library, Recipe, Cooking Mode, Editor, Collections, Favorites, Settings |

## Design decisions

- Ingredients are stored as the original line of text, and quantities are parsed when shown.
  Imported recipes keep their wording and still scale.
- Categories are data, not code: add, rename, reorder or delete them in Settings.
- A recipe can be in several categories and several collections.
- Checked ingredients/steps and the chosen serving size are saved per recipe, so a reload
  mid-cook keeps your place.
- Backups: Settings → Download Backup / Restore. The backup JSON is also the import format
  for the upcoming bulk import of the Drive files.

## Hosting

**Online (current):** Vercel project `moms-recipe-box` on the free Hobby plan.
Pushing to `main` on GitHub deploys automatically.

- The library is one JSON file in a private Vercel Blob store; photos are separate files.
  The first save of each day keeps the previous day's library under `backups/`.
- `FAMILY_PASSCODE` (Vercel → Settings → Environment Variables) is the passcode each
  device asks for once. Change it there and redeploy; devices then ask again.
  Capitals and spaces don't matter.
- Writes are batched (3 s) and other devices pick up changes when the app is reopened
  or every 2 minutes, to stay well inside the free storage limits.

**Home server (alternative):** `npm run build && node server/index.mjs` on any computer
on the home Wi-Fi, then open `http://<that computer>:8080`. Data lives in `data/`.

## Testing

`npm test` runs the logic tests. `shots/vercel/` runs the real `api/` code locally against
an in-memory Blob mock (`serve.mjs`) and drives two devices through it (`e2e.cjs`).
