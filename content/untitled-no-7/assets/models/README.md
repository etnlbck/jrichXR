# Models

| File | Role |
|------|------|
| `finished.glb` | Finished sculpture (web + Android) — Draco, keep &lt;10 MB |
| `raw.glb` | Raw / guide-marked stone (web + Android) |
| `finished.usdz` / `raw.usdz` | iOS twins for Aura Lenses (pending) |

**Current note:** `raw.glb` is interim (duplicate of finished). WebAR applies a cool/matte tint so the morph is visible. Replace with an aligned raw-stone mesh, remove `"interim": true` from `experience.json`, bump `version`, run `npm run sync-content && npm run check-assets`.

Convert Meshy OBJ → finished:

```bash
npm run convert-meshy
npx @gltf-transform/cli optimize content/untitled-no-7/assets/models/finished.glb content/untitled-no-7/assets/models/finished.glb --compress draco
npm run sync-content
```
