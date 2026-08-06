# JRichForms XR — Proof of Concept Build Plan

**Concept:** Scan a QR/marker beside an obsidian sculpture → phone camera opens a browser AR view → the finished piece appears anchored to the physical work → tap to morph to the raw, guide-marked stone → the artist narrates the transformation.

**This POC's job:** Prove the single riskiest chain end-to-end — *marker recognition → anchored 3D → raw↔finished morph → triggered narration* — on a real iPhone in Safari, with no app install.

**Host:** Next.js (App Router) on **Vercel** (HTTPS by default).

**Chosen anchoring approach:** Image-target marker card. Polished black obsidian is near worst-case for markerless SLAM; a printed placard/card beside the piece drives tracking.

---

## 1. Why this stack

iOS Safari still exposes no WebXR (`immersive-ar`). 8th Wall runs a **WASM computer-vision pipeline** over `getUserMedia` and feeds a tracked pose into Three.js.

| Layer | Tech | Who owns it |
|---|---|---|
| App / hosting | Next.js App Router → Vercel | You |
| Camera | `getUserMedia` | Browser |
| Tracking | 8th Wall engine (WASM) | 8th Wall / Niantic Spatial |
| Rendering | Three.js + GLTF/DRACO loaders | You |
| UI / narration | React client components | You |

**Engine distribution (current):** The MIT open-source framework at `packages/engine` includes Image Targets but is not yet a drop-in npm release (Bazel build). This POC uses **`@8thwall/engine-binary`** (includes Image Targets via the `slam` chunk) with **`disableWorldTracking: true`**. Attribution is required — see [LICENSING.md](LICENSING.md). Revisit MIT-only if/when an official npm build ships.

**Image target API:** Load CLI JSON with `imageTargetData` (not the old cloud `imageTargets: ['name']` list):

```ts
XR8.XrController.configure({
  disableWorldTracking: true,
  imageTargetData: [await fetch('/assets/targets/jrichforms-placard.json').then(r => r.json())],
})
```

Sources: [engine overview](https://8thwall.org/docs/engine/overview), [image targets](https://8thwall.org/docs/engine/guides/image-targets), [repo](https://github.com/8thwall/8thwall).

---

## 2. Scope

**In scope (POC):**
- One sculpture ("Untitled No. 7").
- One printed image target.
- Two 3D states: finished + raw GLB (placeholder cube until assets land).
- Tap cross-fade + guide-mark overlay.
- Narration on morph tap + provenance card.
- iPhone Safari + Android Chrome via Vercel HTTPS URL.

**Out of scope:** Markerless stone tracking, multi-piece CMS, SiteWalks, full aglitch.art vector morph, advanced occlusion/relighting.

---

## 3. Architecture

```
QR ──► Vercel (Next.js HTTPS)
          │
          ▼
   app/page.tsx ──► ArExperience (client-only)
          │
          ├─ public/xr/engine/xr.js  (WASM CV, slam chunk)
          ├─ imageTargetData JSON
          └─ Three.js anchor ── finished / raw / overlay
                    │
                    └─ morph + narration + provenance
```

**State machine:** `START → SCANNING → ANCHORED → RAW/FINISHED` (morph toggles). Marker loss returns to `SCANNING` but preserves morph state.

**Key paths:**
- [`app/page.tsx`](app/page.tsx) — mounts client AR
- [`components/ArExperience.tsx`](components/ArExperience.tsx) — UI + boot gesture
- [`lib/xr-boot.ts`](lib/xr-boot.ts) — script load, configure, run
- [`lib/scene.ts`](lib/scene.ts) — models, cube fallback, morph
- [`lib/config.ts`](lib/config.ts) — piece + asset paths
- [`public/assets/`](public/assets/) — media + targets
- [`scripts/copy-xr-assets.mjs`](scripts/copy-xr-assets.mjs) — postinstall copy of engine

---

## 4. Asset pipeline

See **[ASSETS.md](ASSETS.md)** for the parallel capture checklist.

| Asset | How | Notes |
|---|---|---|
| Finished / raw GLB | Photogrammetry → Blender align | Shared origin/scale; &lt;10 MB |
| Overlay PNG | aglitch.art | Static plane fade-in |
| Image target | `@8thwall/image-target-cli` | Matte print; not the stone |
| Narration MP3 | Artist recording | Gesture-gated on iOS |

---

## 5. Milestones

**Milestone 0 — De-risk (done in scaffold):**
Engine loads on Vercel HTTPS; test marker processed; orange placeholder cube on target found. Confirm camera permission + recognition on a real iPhone.

**Milestone 1 — Anchored model:**
Drop `finished.glb`, set `usePlaceholderCube: false`, tune `placement`.

**Milestone 2 — Morph:**
Add `raw.glb` + overlay; polish cross-fade timing.

**Milestone 3 — Narration + provenance:**
Drop `narration.mp3`; fill piece metadata.

**Milestone 4 — Field test:**
Print real marker beside the piece; 3+ devices; inspect `window.__JRF_METRICS`.

**Definition of done:** Stranger scans QR → finished piece anchored ~4s → tap morph + narration → provenance — own iPhone, no install.

---

## 6. Risks (ranked)

1. **Obsidian scan quality** — specular black stone. Mitigate with cross-pol / dulling spray; validate mesh before wiring.
2. **iOS camera + gesture** — explicit Begin gate; audio unlock on same tap.
3. **Engine distribution** — binary license + attribution; MIT npm not ready.
4. **Gallery lighting vs marker** — matte high-contrast target; test in situ.
5. **Model weight on cellular** — Draco, &lt;10 MB budget.
6. **THREE instance mismatch** — keep one `three` npm version; assign `window.THREE` before boot.

---

## 7. Local / deploy

```bash
npm install          # also copies engine → public/xr
npm run dev          # http://localhost:3000 — use ngrok for phone camera
npm run build && npm start
# or: vercel
```

Phone camera needs HTTPS (or localhost). Prefer a Vercel preview URL for device tests.
