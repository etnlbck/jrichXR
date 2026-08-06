# vendor/

Self-hosted third-party bundles (not committed — see `.gitignore`).

Place here, and confirm the exact filenames/paths against the current 8th Wall engine docs:

- `8thwall-engine.js` — the open-source 8th Wall engine build (image-target module). From https://github.com/8thwall/8thwall (`packages/engine`). See https://8thwall.org/docs/engine/overview.
- `xrextras.js` — 8th Wall helper modules (`packages/xrextras`).
- `GLTFLoader.js` — Three.js GLTFLoader matching your pinned Three.js version (r128 in `index.html`). From the three.js examples/js build.

`index.html` references these paths. If you use a module/bundler setup instead of plain script tags, adjust the includes and `js/app.js` imports accordingly.
