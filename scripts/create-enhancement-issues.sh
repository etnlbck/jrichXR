#!/usr/bin/env bash
# Creates enhancement backlog issues on etnlbck/jrichXR. Requires: gh auth.
set -euo pipefail
REPO="${REPO:-etnlbck/jrichXR}"

ensure_label() {
  local name="$1" color="$2" desc="$3"
  if gh label list --repo "$REPO" --limit 200 --json name -q '.[].name' | grep -qx "$name"; then
    return 0
  fi
  gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" 2>/dev/null \
    || true
}

ensure_label "enhancement" "a2eeef" "New feature or request"
ensure_label "activation" "d4c5f9" "Visitor Arrive / reveal"
ensure_label "ar" "0e8a16" "WebAR / 3D runtime"
ensure_label "studio" "fbca04" "Artist Studio"
ensure_label "content" "c5def5" "Experience content model"
ensure_label "platform" "e99695" "Metrics, a11y, infra"

create_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --body "$body"
}

create_issue "Harden and instrument Arrive reveal" "enhancement,activation" "$(cat <<'EOF'
## Why
First-lock densify shipped; field quality depends on knowing when Arrive succeeds/fails and surviving brief tracking flicker.

## Scope
- Reveal funnel `mark()`s: start / complete / cancel / ms-to-chrome
- Short tracking grace so flicker does not abort densify mid-play
- Brandable scan copy (“Aim at the marker…”, “Found”) via brand or gallery fields

## Notes
Effort **M**. Related: device-adaptive point budget (separate issue). See `apps/web/lib/reveal.ts`, `apps/web/lib/scene.ts`, `apps/web/lib/metrics.ts`.
EOF
)"

create_issue "Polish densify look (splat-feel)" "enhancement,activation" "$(cat <<'EOF'
## Why
Current CPU `Points` cloud (~2200) reads as scatter dots, not materialization.

## Scope
- Soft size/glow and brand accent falloff on the reveal cloud
- Tune scatter / densify easing for a stronger splat aesthetic
- Optional later: lighter GPU/shader pass (larger effort)

## Notes
Effort **M–L**. Builds on Path A densify in `apps/web/lib/scene.ts`. Real 3DGS is a separate parked issue.
EOF
)"

create_issue "Studio knobs for Arrive densify" "enhancement,studio,activation" "$(cat <<'EOF'
## Why
Morph/audio are editable in Studio; Arrive timings live only in `reveal.ts`.

## Scope
- Expose densify duration / scatter (and related) in Placement or Brand
- Persist on experience/gallery config and honor at runtime

## Notes
Effort **M**. Mirror existing morph/overlay editor patterns in AdminEditor.
EOF
)"

create_issue "Pin/provenance sheet keyboard and focus" "enhancement,activation" "$(cat <<'EOF'
## Why
Pin and provenance panels open after Arrive but lack dialog keyboard UX.

## Scope
- Escape to close
- Focus trap while open
- Restore focus on close
- Basic dialog semantics (`role="dialog"`, labelled title)

## Notes
Effort **S**. `ArExperience.tsx` panels.
EOF
)"

create_issue "Delete unused ArExperience visitor CSS" "enhancement,activation" "$(cat <<'EOF'
## Why
~36 unused classes (`ctaPill`, preview stage, social/connect, fullOverlay tabs/forms) increase maintenance noise.

## Scope
- Delete unused visitor CSS in `ArExperience.module.css` (do not revive CTAs in this issue)

## Notes
Effort **S**. Productizing post-morph CTAs would be a separate feature if desired later.
EOF
)"

create_issue "Honor richer mural node types in WebAR" "enhancement,ar,content" "$(cat <<'EOF'
## Why
Package models image/video/audio/gltf + triggers; WebAR mostly drives finished/raw GLB + overlay + pins.

## Scope
- Map mural node types/triggers into the visitor runtime where feasible
- Document what remains out of scope for WebAR v1

## Notes
Effort **L**.
EOF
)"

create_issue "Device-adaptive densify point budget" "enhancement,activation,ar" "$(cat <<'EOF'
## Why
Fixed `pointBudget` may jank mid/low phones during first lock.

## Scope
- Scale point count from XR8 device estimate (or similar)
- Cap/floor budgets; keep densify readable on low-end

## Notes
Effort **M**. Cross-links with Harden Arrive. `apps/web/lib/reveal.ts`.
EOF
)"

create_issue "Studio badges for unsupported AR features" "enhancement,studio" "$(cat <<'EOF'
## Why
Typed flags like `personOcclusion` / placement modes can set false expectations if Studio shows them as live.

## Scope
- Surface clear “not in WebAR yet” (or similar) badges for unsupported capabilities

## Notes
Effort **S**.
EOF
)"

create_issue "Brand preview beyond Begin gate" "enhancement,studio" "$(cat <<'EOF'
## Why
BrandFields preview stops at the Begin gate; artists cannot preview densify, chrome, or pin color in situ.

## Scope
- Extend brand/studio preview to Arrive chrome and pin color (and densify if practical)

## Notes
Effort **M**.
EOF
)"

create_issue "Nodes authoring (add/remove/type/triggers)" "enhancement,studio" "$(cat <<'EOF'
## Why
Nodes tab is inspect/edit transforms only; richer content stays JSON-handcrafted.

## Scope
- Add/remove nodes
- Choose type and triggers
- Persist through draft/publish

## Notes
Effort **L**.
EOF
)"

create_issue "Publish readiness warnings (placeholder/interim)" "enhancement,studio" "$(cat <<'EOF'
## Why
Placeholder cube and interim raw assets can still ship by accident.

## Scope
- Warn (or soft-block) on publish when placeholder/interim paths are active

## Notes
Effort **S**.
EOF
)"

create_issue "In-experience share sheet / QR handoff" "enhancement,studio" "$(cat <<'EOF'
## Why
Share image exists for OG/Twitter; visitors lack an in-AR share sheet or QR handoff.

## Scope
- In-experience share affordance using brand share image where set
- Optional QR for desktop → phone handoff beyond DesktopGate

## Notes
Effort **M**.
EOF
)"

create_issue "Support additional experience kinds" "enhancement,content" "$(cat <<'EOF'
## Why
Copy is generic; data model is still mural/sculpture-shaped (`kind` union, morph, provenance, shop).

## Scope
- Extend package + config + Studio/visitor UI for at least one additional kind when needed
- Avoid sculpture-only assumptions in new surfaces

## Notes
Effort **L**.
EOF
)"

create_issue "Richer pins (links, media, CTAs)" "enhancement,content" "$(cat <<'EOF'
## Why
Pins are text + optional audio only; CTA/social patterns exist only as dead CSS.

## Scope
- Pin links, images, or CTA actions
- Visitor sheet UI for rich content

## Notes
Effort **M**.
EOF
)"

create_issue "Real 3D Gaussian splat pipeline (parked)" "enhancement,ar" "$(cat <<'EOF'
## Why
Path A densify is aesthetic-only; true 3DGS needs a platform investment.

## Scope (parked)
- Three.js upgrade compatible with XR8
- Splat asset upload/publish + loader
- Mobile perf fallback to Path A densify

## Notes
Effort **L**. Platform bet — not the next polish pass.
EOF
)"

create_issue "Persist visitor metrics beyond console" "enhancement,platform" "$(cat <<'EOF'
## Why
`metrics.ts` is console / `window.__JRF_METRICS` only; field tests cannot aggregate activation quality.

## Scope
- Beacon, Vercel Analytics, or similar for key marks (boot, first lock, reveal complete/cancel)

## Notes
Effort **M**.
EOF
)"

create_issue "Visitor AR accessibility pass" "enhancement,platform" "$(cat <<'EOF'
## Why
Loading has `aria-live`; sheets and canvas morph/pins remain thin for keyboard and AT users.

## Scope
- Sheet dialog a11y (coord with sheet keyboard issue)
- Document reduced-motion behavior
- Improve non-pointer affordances where feasible without breaking AR

## Notes
Effort **M**.
EOF
)"

echo "Done."
