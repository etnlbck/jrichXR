# USDZ conversion (iOS native)

iOS mural models must be `.usdz` (or `.reality`). Android/Web use Draco GLB.

## Preferred: Reality Converter (Apple)

1. Install [Reality Converter](https://developer.apple.com/augmented-reality/tools/) from Apple.
2. Open each GLB:
   - `/Users/etnblck/_projects/jrichforms-xr-poc/content/untitled-no-7/assets/models/finished.glb`
   - `/Users/etnblck/_projects/jrichforms-xr-poc/content/untitled-no-7/assets/models/raw.glb`
3. Export USDZ next to the GLB with matching names:
   - `/Users/etnblck/_projects/jrichforms-xr-poc/content/untitled-no-7/assets/models/finished.usdz`
   - `/Users/etnblck/_projects/jrichforms-xr-poc/content/untitled-no-7/assets/models/raw.usdz`
4. Re-run `npm run convert-usdz` (should report OK) then `npm run check-assets`.
5. Clear `"status": "pending"` on `finished-usdz` / `raw-usdz` in `experience.json`.

## Keep parity

- Same origin / up-axis / scale as the GLB pair used on WebAR.
- Prefer embedded textures; avoid external `.png` refs that break after upload.
- Target &lt; 25 MB per USDZ for TestFlight comfort (GLB already Draco &lt; 10 MB).

