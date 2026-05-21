# Voyager GitHub Pages CORS Fix

The browser cannot read the JPL Horizons API directly from GitHub Pages because the remote API response does not grant cross-origin access to your GitHub Pages domain.

This package avoids that problem by loading a same-origin static file:

```txt
data/voyager_vectors.json
```

## Recommended workflow

1. Put `index.html` and the `scripts` folder into your GitHub Pages repository.
2. Run this locally once:

```bash
node scripts/fetch-voyager-data.mjs
```

3. Commit the generated file:

```bash
git add index.html scripts/fetch-voyager-data.mjs data/voyager_vectors.json
git commit -m "Add Voyager trajectory data"
git push
```

4. Open your GitHub Pages site and click `Load Bundled JPL Data`.

## Automatic monthly refresh

Copy `.github/workflows/update-voyager-data.yml` into your repository. In GitHub, go to Actions and run `Update Voyager trajectory data` manually once, or let it refresh monthly.

## Optional live proxy

`worker/horizons-proxy-worker.js` is a Cloudflare Worker example. Use it only if you want live browser-side calls. The bundled static JSON approach is simpler and better for GitHub Pages.
