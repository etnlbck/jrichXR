# Enhancement implementation plans — index

Plans for the post-Arrive enhancement backlog. GitHub issues may be created later via [`scripts/create-enhancement-issues.sh`](../../../scripts/create-enhancement-issues.sh); titles below are the stable keys. Closing shipped waves uses [`scripts/close-enhancement-waves.sh`](../../../scripts/close-enhancement-waves.sh) so PRs include `Closes #N`.

**Sequencing:** Waves 1–3 shipped · Wave 4 lite (gaps) shipped · **Wave 5 = deferred slices (18–25)** · #17 parked.

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
| 14 | Honor richer mural node types in WebAR | 3 | L | [14-richer-mural-nodes.md](14-richer-mural-nodes.md) | done |
| 15 | Nodes authoring (add/remove/type/triggers) | 3 | L | [15-nodes-authoring.md](15-nodes-authoring.md) | done |
| 16 | Support additional experience kinds | 3 | L | [16-experience-kinds.md](16-experience-kinds.md) | done |
| 17 | Real 3D Gaussian splat pipeline (parked) | — | L | [17-real-3dgs-pipeline.md](17-real-3dgs-pipeline.md) | parked |
| 18 | Video/audio/loop/proximity + extra glTF | 5 | L | [18-video-audio-proximity-nodes.md](18-video-audio-proximity-nodes.md) | planned |
| 19 | Studio non-image node authoring | 5 | M–L | [19-non-image-node-authoring.md](19-non-image-node-authoring.md) | planned |
| 20 | Densify preview scrubber in Brand | 5 | M | [20-densify-preview-scrubber.md](20-densify-preview-scrubber.md) | planned |
| 21 | Hard publish block / readiness banner | 5 | S–M | [21-hard-publish-readiness.md](21-hard-publish-readiness.md) | planned |
| 22 | Social share targets | 5 | M | [22-social-share-targets.md](22-social-share-targets.md) | planned |
| 23 | Arrive audio sting / haptics | 5 | S–M | [23-arrive-audio-haptics.md](23-arrive-audio-haptics.md) | planned |
| 24 | Post-morph scene CTA overlays | 5 | M–L | [24-post-morph-scene-ctas.md](24-post-morph-scene-ctas.md) | planned |
| 25 | Desculpture experience kind | 5 | L | [25-desculpture-experience-kind.md](25-desculpture-experience-kind.md) | planned |

## Suggested build order (Wave 5)

1. Hard publish readiness banner ([21](21-hard-publish-readiness.md)) — small, unblocks safer shipping  
2. Arrive sting / haptics ([23](23-arrive-audio-haptics.md)) — isolated delight  
3. Densify preview scrubber ([20](20-densify-preview-scrubber.md))  
4. Social share targets ([22](22-social-share-targets.md))  
5. Video/audio/proximity + extra glTF runtime ([18](18-video-audio-proximity-nodes.md)) then Studio authoring ([19](19-non-image-node-authoring.md))  
6. Scene CTAs ([24](24-post-morph-scene-ctas.md))  
7. Desculpture experience kind ([25](25-desculpture-experience-kind.md)) when productizing generic XR  

Keep [17](17-real-3dgs-pipeline.md) parked until a platform bet is approved.

## Related

- Enhancement backlog discussion: Cursor plan `enhancement_backlog_*`
- Gaps review: Cursor plan `enhancement_gaps_review_*`
- Activation densify shipped: Path A in `apps/web/lib/scene.ts` + `reveal.ts`
