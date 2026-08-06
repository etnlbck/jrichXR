# JRichForms XR — Proof of Concept Build Plan

**Concept:** Scan a QR/marker beside an obsidian sculpture → phone camera opens a browser AR view → the finished piece appears anchored to the physical work → tap to morph to the raw, guide-marked stone → the artist narrates the transformation.

**This POC's job:** Prove the single riskiest chain end-to-end — *marker recognition → anchored 3D → raw↔finished morph → triggered narration* — on a real iPhone in Safari, with no app install, using only the open-source 8th Wall engine.

**Chosen anchoring approach:** Image-target marker card (decided). A printed reference card (or the wall placard) beside the piece drives tracking. This is the pragmatic choice because polished black obsidian is close to worst-case for markerless SLAM (specular, low-texture, reflective), and image targets give a stable, repeatable lock without depending on the stone's own surface.

---

## 1. Why this stack, and where the WASM actually is

The reason this route can serve the "WebXR narrative" on iPhone at all is that **iOS Safari still exposes no WebXR** (`immersive-ar`) as of 2026. So instead of a browser AR session, 8th Wall runs its **own computer-vision pipeline compiled to WebAssembly**, taking the `getUserMedia` camera feed and producing a tracked pose that we render 3D against with Three.js.

That is the "using WASM" part: you are **consuming** the engine's WASM CV runtime (compiled from the C++ in the 8th Wall repo), not authoring WASM yourself. The division of labor:

| Layer | Tech | Who owns it |
|---|---|---|
| Camera access | `getUserMedia` (Safari-native) | Browser |
| Tracking (marker detection → pose) | 8th Wall engine — **WASM CV runtime** | 8th Wall (MIT `engine` package) |
| Rendering (model, morph, overlay) | Three.js | You |
| UI, narration, provenance | HTML/CSS/JS | You |

**Licensing consequence that matters:** Image Targets live in the **MIT-licensed** `engine` package. World tracking / SLAM ("World Effects") is the piece that ships as a **binary-only** redistributable. Because we chose image targets and will run with world tracking **disabled**, this POC can stay entirely inside MIT-licensed open source and does not require the SLAM binary. *(Verify this holds in the current engine build during Milestone 0 — it's the one open assumption in the plan. If image tracking pulls in the binary, that's fine too — the binary is free for commercial use — but confirm which license you're operating under.)*

Sources to confirm current API against: <https://8thwall.org/docs/engine/overview>, repo <https://github.com/8thwall/8thwall>, engine distribution / SLAM binary <https://8th.io/xrjs>.

---

## 2. Scope

**In scope (POC):**
- One sculpture ("Untitled No. 7" per the concept page).
- One printed image target that the engine recognizes.
- Two 3D states: finished piece + raw marked stone, loaded as glTF/GLB.
- Anchored placement of the finished model relative to the detected marker.
- A single tap that cross-fades finished → raw and reveals the guide-mark overlay.
- One narration audio clip triggered on the morph.
- A static provenance card (material, dimensions, link to acquire).
- Runs on iPhone Safari + Android Chrome from a QR-linked HTTPS URL.

**Explicitly out of scope (defer):**
- Markerless "place on the piece itself" tracking (obsidian is too hostile — revisit only if the marker UX tests poorly).
- Multiple sculptures / a CMS. Hardcode one piece.
- SiteWalks provenance integration and collector gating.
- aglitch.art automated SVG generation pipeline — the POC uses one pre-exported SVG/PNG overlay.
- Occlusion, relighting, shadows beyond a simple ground shadow.

---

## 3. Architecture

```
QR code ──► HTTPS URL (static host)
                │
                ▼
        index.html  ── loads ──►  8th Wall engine (WASM CV runtime)
                │                        │
                │                        ├─ camera pipeline (getUserMedia)
                │                        └─ image-target detection ─► pose
                ▼                                     │
        Three.js scene (scene.js)  ◄── anchor group ─┘
                │
        ┌───────┼─────────────────────────────┐
        ▼       ▼                             ▼
   finished   raw stone                guide-mark overlay
   GLB model  GLB model                (SVG→texture plane)
        │
        ▼
   ui.js  ── tap ──► morph state machine ──► narration audio + provenance card
```

**State machine (ui.js):**
`SCANNING → TARGET_FOUND (finished shown) → MORPHING → RAW (overlay + narration) → [tap] → FINISHED …`
Losing the marker returns to `SCANNING` but preserves the last morph state so re-acquisition doesn't restart the story.

---

## 4. Asset pipeline

| Asset | How it's made | Format | Notes |
|---|---|---|---|
| Finished model | Polycam / Luma photogrammetry of the polished piece | `.glb` | Decimate to <100k tris, <10 MB. Bake lighting into texture. |
| Raw model | Photogrammetry of the raw marked stone (or the finished mesh re-textured with the marked-stone photos for POC speed) | `.glb` | Must share origin/scale with finished model so the morph registers. |
| Guide-mark overlay | One sculpture photo run through aglitch.art → SVG, exported to transparent PNG | `.png` (or SVG rasterized) | POC uses a single static overlay, not the full morph vectorization. |
| Image target | The wall placard art or a distinct printed card → processed with 8th Wall `image-target-cli` | engine target file | High-contrast, feature-rich, matte print. **Not** the obsidian itself. |
| Narration | One recorded clip of the artist | `.mp3` (~30–60s) | Autoplay is gesture-gated on iOS — trigger on the user's tap, not on target-found. |

**Critical asset constraint:** the finished and raw meshes must be **aligned in the same local space** (shared origin, up-axis, scale). The morph is a cross-fade between two co-located meshes; if they don't register, the effect breaks. Establish this in Blender before wiring anything.

---

## 5. Milestones

**Milestone 0 — De-risk (½ day, do first):**
Confirm (a) 8th Wall engine loads and tracks an image target on a real iPhone in Safari over HTTPS, using the current documented load mechanism, and (b) image-target-only mode runs without the SLAM binary. Ship a cube on the marker. If this fails, the rest of the plan is moot — surface it immediately.

**Milestone 1 — Anchored model:**
Replace the cube with the finished `.glb`, correctly scaled and oriented to the marker. Stable across marker loss/re-acquire.

**Milestone 2 — The morph:**
Load the raw model co-located with the finished one. Implement the tap-driven cross-fade + overlay reveal. This is the concept's signature beat — get it feeling good.

**Milestone 3 — Narration + provenance:**
Trigger the audio clip on the morph tap (satisfies iOS gesture requirement). Show the provenance card on story completion.

**Milestone 4 — Field test:**
Print the marker, mount beside the actual piece at the studio, test on 3+ devices (at least one older iPhone). Measure: recognition time, tracking stability under gallery lighting, total load time on cellular.

**Definition of done:** A stranger scans the QR, sees the finished piece anchored within ~4s, taps once, watches it morph to raw with narration, and reaches the provenance card — on their own iPhone, no install, no instructions.

---

## 6. Risks (ranked by how much they should worry you)

1. **Obsidian scan quality — highest.** Specular black stone is punishing for photogrammetry. Bad input mesh sinks the whole experience regardless of the AR path. *Mitigation:* cross-polarized lighting or dulling spray during capture; validate the mesh before building anything downstream. Prototype the scan first.
2. **iOS Safari camera + HTTPS friction.** `getUserMedia` requires HTTPS and a user gesture; some iOS versions gate camera behind permission prompts that kill first-run flow. *Mitigation:* explicit "tap to start" gate; test the permission flow early on real hardware.
3. **Engine load mechanism changed.** The old `appKey` CDN model is gone post-open-source. The scaffold flags the engine include as a TODO to reconcile against current docs. *Mitigation:* Milestone 0.
4. **Marker recognition under gallery lighting.** Dim, warm, or glare-heavy lighting degrades detection. *Mitigation:* high-contrast matte marker; test in situ (Milestone 4).
5. **Model weight on cellular.** Photogrammetry meshes are heavy; galleries have weak signal. *Mitigation:* Draco/meshopt compression, <10 MB budget, aggressive texture sizing.
6. **License drift.** Confirm you're operating under MIT (image targets) vs. the binary license (SLAM) and keep the NOTICE accurate.

---

## 7. What to hand a developer

The accompanying scaffold (`/jrichforms-xr-poc`) is a runnable skeleton: engine pipeline wired for image-target-only tracking, a Three.js scene with model-loading and morph logic, the UI state machine, narration + provenance, and placeholder assets with drop-in instructions. The two things a developer must supply are (1) the current engine build/include per the docs and (2) the real `.glb`, marker, overlay, and audio assets. Everything else is scaffolded.
