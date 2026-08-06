# Image target

Processed marker files for the 8th Wall engine live here.

Committed for Milestone 0:

- `jrichforms-placard.json` — metadata loaded via `imageTargetData`
- `jrichforms-placard_*.png` — original / crop / luminance / thumbnail

## Replace with the real placard

1. Create high-contrast matte artwork (not the stone).
2. Run `npx @8thwall/image-target-cli@latest` (or adapt `scripts/make-test-target.mjs`).
3. Drop outputs here and set `imagePath` to `/assets/targets/<name>_luminance.<ext>`.
4. Keep `name` in sync with `lib/config.ts` → `imageTargetName`.

See [ASSETS.md](../../../ASSETS.md) for the full capture checklist.
