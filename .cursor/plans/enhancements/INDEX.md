# Enhancement implementation plans — index

Plans for the post-Arrive enhancement backlog. GitHub issues may be created later via [`scripts/create-enhancement-issues.sh`](../../../scripts/create-enhancement-issues.sh); titles below are the stable keys.

**Sequencing:** Wave 1 detailed → Wave 2 detailed outlines → Wave 3 stubs (expand on demand).

| # | Issue title | Wave | Effort | Plan | Status |
|---|-------------|------|--------|------|--------|
| 1 | Harden and instrument Arrive reveal | 1 | M | [01-harden-arrive.md](01-harden-arrive.md) | done |
| 2 | Device-adaptive densify point budget | 1 | M | [02-adaptive-densify-budget.md](02-adaptive-densify-budget.md) | done |
| 3 | Pin/provenance sheet keyboard and focus | 1 | S | [03-sheet-keyboard-focus.md](03-sheet-keyboard-focus.md) | done |
| 4 | Delete unused ArExperience visitor CSS | 1 | S | [04-delete-dead-css.md](04-delete-dead-css.md) | done |
| 5 | Publish readiness warnings (placeholder/interim) | 1 | S | [05-publish-readiness.md](05-publish-readiness.md) | done |
| 6 | Studio badges for unsupported AR features | 1 | S | [06-unsupported-badges.md](06-unsupported-badges.md) | done |
| 7 | Polish densify look (splat-feel) | 2 | M–L | [07-polish-densify-look.md](07-polish-densify-look.md) | done |
| 8 | Studio knobs for Arrive densify | 2 | M | [08-studio-arrive-knobs.md](08-studio-arrive-knobs.md) | done |
| 9 | Brand preview beyond Begin gate | 2 | M | [09-brand-preview-beyond-begin.md](09-brand-preview-beyond-begin.md) | done |
| 10 | Persist visitor metrics beyond console | 2 | M | [10-persist-visitor-metrics.md](10-persist-visitor-metrics.md) | done |
| 11 | Visitor AR accessibility pass | 2 | M | [11-visitor-a11y-pass.md](11-visitor-a11y-pass.md) | done |
| 12 | In-experience share sheet / QR handoff | 2 | M | [12-in-experience-share.md](12-in-experience-share.md) | done |
| 13 | Richer pins (links, media, CTAs) | 2 | M | [13-richer-pins.md](13-richer-pins.md) | done |
| 14 | Honor richer mural node types in WebAR | 3 | L | [14-richer-mural-nodes.md](14-richer-mural-nodes.md) | stub |
| 15 | Nodes authoring (add/remove/type/triggers) | 3 | L | [15-nodes-authoring.md](15-nodes-authoring.md) | stub |
| 16 | Support additional experience kinds | 3 | L | [16-experience-kinds.md](16-experience-kinds.md) | stub |
| 17 | Real 3D Gaussian splat pipeline (parked) | 3 | L | [17-real-3dgs-pipeline.md](17-real-3dgs-pipeline.md) | parked |

## Suggested build order (Wave 1)

1. Harden Arrive  
2. Adaptive densify budget  
3. Sheet keyboard/focus  
4. Delete dead CSS  
5. Publish readiness  
6. Unsupported badges  

## Related

- Enhancement backlog discussion: Cursor plan `enhancement_backlog_*`
- Activation densify shipped: Path A in `apps/web/lib/scene.ts` + `reveal.ts`
