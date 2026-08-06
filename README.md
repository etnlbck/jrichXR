# JRichForms XR — Proof of Concept

Web AR for a black-obsidian sculpture: scan a marker beside the piece → the finished 3D model appears anchored → tap to morph to the raw, guide-marked stone while the artist narrates. No app install. Runs in mobile Safari/Chrome.

**Stack:** Next.js (App Router) on Vercel · [8th Wall](https://8thwall.org) engine (`@8thwall/engine-binary`, image targets, world tracking disabled) · Three.js.

See **[BUILD-PLAN.md](BUILD-PLAN.md)** for milestones and risks, **[ASSETS.md](ASSETS.md)** for the capture checklist, **[LICENSING.md](LICENSING.md)** for engine license notes.

## Status

Next.js app with Milestone 0 ready:

1. Engine + XRExtras + Landing Page copied to `public/xr/` on `npm install`.
2. Test image target committed under `public/assets/targets/` (print the luminance/cropped PNG).
3. Placeholder cube until you drop real GLBs and set `usePlaceholderCube: false` in [`lib/config.ts`](lib/config.ts).

## Project layout

```
app/                    Next.js App Router (layout, page, globals)
components/             ArExperience client UI
lib/                    config, scene, xr-boot, metrics, types
public/
  xr/                   Engine runtime (postinstall)
  assets/               models, overlays, audio, targets
  draco/                Draco decoder for compressed GLBs
scripts/
  copy-xr-assets.mjs    postinstall vendor copy
  make-test-target.mjs  regenerate test marker JSON
ASSETS.md               Parallel capture checklist
BUILD-PLAN.md           Architecture + milestones
LICENSING.md            MIT helpers vs binary engine
```

## Running locally

```bash
npm install
npm run dev
```

- AR experience: `http://localhost:3000`
- Printable test marker: `http://localhost:3000/marker`

Camera on a physical phone needs HTTPS. Easiest path: deploy a Vercel preview, or tunnel:

```bash
npm run dev
npx ngrok http 3000
```

Regenerate the test marker:

```bash
npm run make-target
```
## Deploying (Vercel)

Connect the repo to Vercel (framework: Next.js). `postinstall` copies the engine into `public/xr` on each build. No COOP/COEP headers required while world tracking stays off.

MIME / cache headers for WASM and GLB are set in [`next.config.ts`](next.config.ts).

## License

App scaffold: MIT (see `LICENSE`). 8th Wall engine binary and helpers: see `LICENSING.md`.
