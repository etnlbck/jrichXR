# JRichForms XR — Proof of Concept

Web AR for a black-obsidian sculpture: scan a marker beside the piece → the finished 3D model appears anchored → tap to morph to the raw, guide-marked stone while the artist narrates. No app install. Runs in mobile Safari/Chrome.

Built on the open-source [8th Wall](https://8thwall.org) engine (image-target tracking, MIT-licensed `engine` package) rendered with Three.js. iOS Safari has no WebXR, so the engine's **WASM computer-vision runtime** does the tracking over the camera feed.

See **[BUILD-PLAN.md](BUILD-PLAN.md)** for the full plan, milestones, and risks.

## Status

Runnable **skeleton**. Two things must be dropped in before it works on a phone:

1. **The 8th Wall engine build** — see the two `vendor/*.js` includes in `index.html`. The old hosted `appKey` CDN was retired when 8th Wall open-sourced (Feb 2026); self-host the engine + `xrextras` bundles from the [repo](https://github.com/8thwall/8thwall). Reconcile the pipeline API in `js/app.js` with the current [engine docs](https://8thwall.org/docs/engine/overview). *(This is Milestone 0 — de-risk it first.)*
2. **Real assets** — `assets/models/finished.glb`, `assets/models/raw.glb`, `assets/overlays/guide-marks.png`, `assets/audio/narration.mp3`, and a processed image target. See each `assets/*/README.md`.

## Project layout

```
index.html          Entry point; loads engine, Three.js, app code
js/
  config.js         Piece metadata, asset paths, placement, morph timings
  app.js            Boots 8th Wall pipeline (image-target-only, no SLAM binary)
  scene.js          Three.js scene, model loading, raw↔finished morph
  ui.js             State machine, narration, provenance card, tap handling
css/styles.css      Minimal UI over the camera feed
assets/             Drop-in models, overlay, audio, image target (see per-folder READMEs)
vendor/             Self-hosted engine + Three.js loaders (not included)
BUILD-PLAN.md       Architecture, milestones, risks, asset pipeline
LICENSING.md        MIT engine vs. binary SLAM — what applies here
```

## Running locally

The camera requires **HTTPS** (or `localhost`) on iOS. Two easy paths:

```bash
# Option A — local HTTPS with a self-signed cert
npx http-server . -S -C cert.pem -K key.pem -p 8443
# then open https://localhost:8443 (accept the cert warning)

# Option B — tunnel a plain server to an HTTPS URL for phone testing
npx http-server . -p 8080
npx ngrok http 8080     # open the https URL ngrok prints, on your phone
```

Then generate a QR code pointing at the deployed HTTPS URL and print it beside the marker.

## Deploying

It's fully static — host anywhere (Netlify, Vercel, GitHub Pages, S3+CloudFront). Ensure HTTPS and that `.glb`/`.wasm` are served with correct MIME types. If a future feature needs SLAM/threads, you'll also need cross-origin isolation headers (`COOP`/`COEP`) — not required for this image-target-only POC.

## License

App scaffold: MIT (see `LICENSE`). 8th Wall engine components carry their own licenses — see `LICENSING.md`.
