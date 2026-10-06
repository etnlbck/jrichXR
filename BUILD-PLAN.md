# JRichForms XR — Proof of Concept Build Plan

**Concept:** Scan a QR/marker beside an obsidian sculpture → phone camera opens a browser AR view → the finished piece appears anchored to the physical work → tap to morph to the raw, guide-marked stone → the artist narrates the transformation.

**This POC's job:** Prove the single riskiest chain end-to-end — *marker recognition → anchored 3D → raw↔finished morph → triggered narration* — on a real iPhone in Safari, with no app install.

**Host:** npm workspaces monorepo — Next.js WebAR in `apps/web` on **Vercel** (HTTPS by default).

**Chosen anchoring approach:** Image-target marker card. Polished black obsidian is near worst-case for markerless SLAM; a printed placard/card beside the piece drives tracking.

---

## Dual-runtime architecture

Shared experience package: [`content/untitled-no-7/`](content/untitled-no-7/) (`experience.json` = eng-compatible mural + `gallery` extension).

| Consumer | Role |
|---|---|
| **jrichforms WebAR** (`apps/web`, 8th Wall) | Primary visitor QR — no app install |
| **Aura Lenses native** (external) | Staff/demo (TestFlight); hard-cut morph + Flutter provenance/Shop sheet |
| **Aura MindAR `/w/:token`** | Secondary WebAR share |

Config is derived via [`apps/web/lib/config.ts`](apps/web/lib/config.ts) + [`packages/experience`](packages/experience) (`@jrichforms/experience`). Eng meters → XR8 units: divide by `marker.physicalWidthM`.

See [`content/untitled-no-7/RELEASE.md`](content/untitled-no-7/RELEASE.md) for dual-publish (Vercel ↔ Lenses S3).

---

## 1. Why this stack (WebAR)

iOS Safari still exposes no WebXR (`immersive-ar`). 8th Wall runs a **WASM computer-vision pipeline** over `getUserMedia` and feeds a tracked pose into Three.js.

| Layer | Tech | Who owns it |
|---|---|---|
| App / hosting | Next.js App Router → Vercel | You |
| Camera | `getUserMedia` | Browser |
| Tracking | 8th Wall engine (WASM) | 8th Wall / Niantic Spatial |
| Rendering | Three.js + GLTF/DRACO loaders | You |
| UI / narration | React client components | You |
| Content contract | `content/untitled-no-7/experience.json` | Shared with Aura |

**Engine distribution (current):** **`@8thwall/engine-binary`** with `slam` chunk and `disableWorldTracking: true`. Attribution required — see [LICENSING.md](LICENSING.md).

---

## 2. Scope

**In scope:**
- One sculpture ("Untitled No. 7") as a shared package.
- One printed image target (8th Wall now; tracking twin + `.mind` later for Aura).
- Finished + raw GLB (Draco &lt;10 MB); WebAR cross-fade morph; native hard-cut.
- Narration on first morph to raw + provenance + `/shop`.
- iPhone Safari + Android Chrome via Vercel HTTPS URL.

**Out of scope:** Markerless stone tracking, multi-piece CMS, Snap/Lens Studio first, replacing 8th Wall with MindAR inside this app, person occlusion on WebAR v1.

---

## 3. Architecture

```
content/untitled-no-7/experience.json
          │
          ├─► @jrichforms/experience + apps/web (Vercel) ── QR WebAR ── /shop
          │
          └─► prepare-lenses → Aura Lenses publish (external)
                    ├─ native ARKit/ARCore (demo)
                    └─ MindAR /w share (secondary)
```

**State machine:** `START → SCANNING → ANCHORED → RAW/FINISHED` (morph toggles). Marker loss returns to `SCANNING` but preserves morph state.

**Key paths:**
- [`content/untitled-no-7/`](content/untitled-no-7/) — package source of truth
- [`packages/experience/`](packages/experience/) — `@jrichforms/experience` types + XR8 helpers
- [`apps/web/lib/config.ts`](apps/web/lib/config.ts) — loads package for WebAR/shop
- [`apps/web/components/ArExperience.tsx`](apps/web/components/ArExperience.tsx) — UI + boot gesture
- [`apps/web/lib/xr-boot.ts`](apps/web/lib/xr-boot.ts) / [`apps/web/lib/scene.ts`](apps/web/lib/scene.ts) — 8th Wall + morph
- [`scripts/sync-content.mjs`](scripts/sync-content.mjs) — content → `apps/web/public/assets`
- [`scripts/prepare-lenses-publish.mjs`](scripts/prepare-lenses-publish.mjs) — Lenses payload stub

---

## 4. Asset pipeline

| Asset | How | Notes |
|---|---|---|
| Finished / raw GLB | Photogrammetry / Meshy → Draco | Align origin/scale; &lt;10 MB; `npm run convert-meshy` |
| Overlay PNG | Guide marks | `content/.../overlays/` |
| Image target | `@8thwall/image-target-cli` | Matte print; one master for all runtimes |
| Narration MP3 | Artist recording | Begin unlock; first enter-raw only |
| USDZ twins | Reality Converter / RCP | Aura iOS only |
| Tracking twin + `.mind` | Aura Lenses tools | Phase 3–4 |

---

## 5. Milestones

**Milestone 0 — De-risk (done):** Engine + test marker + placeholder cube path.

**Milestone 1 — Shared package / WebAR on package (done):** `experience.json` drives config, scene placement, morph timing, audio policy, provenance/shop CTAs, and metadata; loading gate after Begin; sync/prepare scripts.

**Milestone 2 — Anchored models (done in repo):** Finished GLB (Draco &lt;10 MB); interim raw with cool tint for visible morph; overlay; silent narration marked interim; `usePlaceholderCube: false`; `npm run check-assets`; scale checklist on `/marker` + [PHASE2.md](content/untitled-no-7/PHASE2.md).

**Milestone 3 — Field test:** Measure `physicalWidthM` on print; 3+ devices under gallery lighting; replace interim raw + real narration; clear `interim` flags.

**Milestone 4 — Aura native publish (in progress):** `prepare-lenses` embeds `gallery`; `publish-lenses` / `convert-usdz`; native hard-cut + Flutter sheet wired in Aura Lenses; USDZ files + live API publish still required — see [PHASE3.md](content/untitled-no-7/PHASE3.md).

**Milestone 5 — MindAR secondary:** `.mind` + `/w/:token` share QR.

**Definition of done (gallery visitors):** Stranger scans QR → finished piece anchored ~4s → tap morph + narration → provenance → shop — own iPhone, no install.

---

## 6. Risks (ranked)

1. **Obsidian scan quality** — specular black stone.
2. **iOS camera + gesture** — Begin gate; audio unlock.
3. **Scale parity** — measure placard; eng→XR8 remap; field-test vs native later.
4. **Dual-publish drift** — follow `RELEASE.md`.
5. **Model weight** — Draco &lt;10 MB.
6. **Engine license** — binary attribution.

---

## 7. Local / deploy

```bash
npm install          # workspaces + engine → apps/web/public/xr + sync-content
npm run sync-content # after editing content/untitled-no-7/assets
npm run prepare-lenses
npm run convert-usdz # Reality Converter until USDZ exist
# DRY_RUN=1 npm run publish-lenses
npm run dev          # @jrichforms/web → http://localhost:3000
```

Vercel: Root Directory `apps/web`, install/build from monorepo root (see [`apps/web/vercel.json`](apps/web/vercel.json)).

Phone camera needs HTTPS (or localhost). Prefer a Vercel preview URL for device tests.
