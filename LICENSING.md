# Licensing notes

This POC deliberately uses only image-target tracking so it can stay inside 8th Wall's open-source surface.

| Component | License | Applies here? |
|---|---|---|
| 8th Wall `engine` package (Image Targets, Face/Sky Effects), `xrextras`, utilities, samples | **MIT** ([repo](https://github.com/8thwall/8thwall)) | **Yes** — image-target tracking is the core of this POC |
| World tracking / SLAM ("World Effects"), Absolute Scale — the distributed engine binary | **Binary-only "limited use" license**, free incl. commercial ([8th.io/xrjs](https://8th.io/xrjs)) | **No** — we run with `disableWorldTracking: true` |
| 8th Wall Desktop editor | Free download; full open source "coming soon" | Optional (not used by this scaffold) |
| Three.js | MIT | Yes |
| This scaffold | MIT (`LICENSE`) | — |

**Open assumption to verify (Milestone 0):** confirm the current open-source engine build performs image-target detection *without* pulling in the binary SLAM component. If it does require the binary, that's still free for commercial use — just update this file so the NOTICE is accurate. Check the [license FAQ](https://8th.io/license-FAQ).

Always review the upstream license text before shipping commercially.
