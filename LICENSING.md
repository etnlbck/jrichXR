# Licensing notes

This POC uses **image-target tracking** with world tracking disabled. Helpers are MIT; the AR runtime currently comes from the distributed engine binary.

| Component | License | Applies here? |
|---|---|---|
| `@8thwall/engine-binary` (`public/xr/engine`) — World Effects, Face Effects, **Image Targets**, Sky Effects, Absolute Scale | **Binary-only limited-use** ([LICENSE](https://github.com/8thwall/engine/blob/main/LICENSE), [FAQ](https://8th.io/license-FAQ)) | **Yes** — Image Targets are loaded via the `slam` chunk; we set `disableWorldTracking: true` so SLAM pose is not used |
| MIT open-source engine framework (`packages/engine` in [8thwall/8thwall](https://github.com/8thwall/8thwall)) — Face / Image Targets / Sky, no SLAM | **MIT** | **Not yet** — no official npm drop-in; revisit when available |
| `@8thwall/xrextras`, `@8thwall/landing-page`, `@8thwall/image-target-cli` | **MIT** | Yes |
| Three.js | MIT | Yes |
| This app | MIT (`LICENSE`) | — |

## Attribution (required for the binary)

When distributing apps that use the engine binary you must retain Niantic Spatial copyright notices. This app:

- Serves the unmodified `xr.js` header from `@8thwall/engine-binary`
- Shows a small on-screen credit in the AR UI
- Declares the notice in `app/layout.tsx` metadata

See [Attribution Guidelines](https://8thwall.org/docs/open-source).

## Commercial use

The binary license allows commercial use when the product’s value does not derive entirely from the engine itself (e.g. a branded gallery experience is fine). Review the full license before shipping.

Always review upstream license text before commercial release.
