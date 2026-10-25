#!/usr/bin/env bash
# Ensure Wave 1–3 enhancement issues exist, then open/update a PR that Closes them.
# Requires: gh auth login (or a valid GH_TOKEN). Repo default: etnlbck/jrichXR
set -euo pipefail

REPO="${REPO:-etnlbck/jrichXR}"
BASE="${BASE:-master}"
HEAD="${HEAD:-feat/own-ar-ui}"
WAVES="${WAVES:-1,2,3}" # comma list: 1 | 2 | 3

need_gh() {
  if ! gh auth status -h github.com >/dev/null 2>&1; then
    echo "gh is not authenticated. Run: gh auth login" >&2
    echo "Or set a valid GH_TOKEN / unset an invalid GH_TOKEN." >&2
    exit 1
  fi
}

ensure_label() {
  local name="$1" color="$2" desc="$3"
  if gh label list --repo "$REPO" --limit 200 --json name -q '.[].name' | grep -qx "$name"; then
    return 0
  fi
  gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" 2>/dev/null || true
}

# title -> "labels|body file marker" — bodies reused from create script via short stubs
issue_for_title() {
  local title="$1"
  local existing
  existing="$(gh issue list --repo "$REPO" --state all --limit 200 --json number,title \
    -q ".[] | select(.title == \"$title\") | .number" | head -1)"
  if [[ -n "$existing" ]]; then
    echo "$existing"
    return 0
  fi
  return 1
}

create_if_missing() {
  local title="$1"
  local labels="$2"
  local body="$3"
  local n
  if n="$(issue_for_title "$title")"; then
    echo "$n"
    return 0
  fi
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --body "$body" \
    | sed -n 's|.*/issues/\([0-9]*\).*|\1|p'
}

need_gh

ensure_label "enhancement" "a2eeef" "New feature or request"
ensure_label "activation" "d4c5f9" "Visitor Arrive / reveal"
ensure_label "ar" "0e8a16" "WebAR / 3D runtime"
ensure_label "studio" "fbca04" "Artist Studio"
ensure_label "content" "c5def5" "Experience content model"
ensure_label "platform" "e99695" "Metrics, a11y, infra"

CLOSES=()

wave_includes() {
  [[ ",$WAVES," == *",$1,"* ]]
}

if wave_includes 1; then
  CLOSES+=("$(create_if_missing "Harden and instrument Arrive reveal" "enhancement,activation" "Shipped in Wave 1 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Device-adaptive densify point budget" "enhancement,activation,ar" "Shipped in Wave 1 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Pin/provenance sheet keyboard and focus" "enhancement,activation" "Shipped in Wave 1 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Delete unused ArExperience visitor CSS" "enhancement,activation" "Shipped in Wave 1 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Publish readiness warnings (placeholder/interim)" "enhancement,studio" "Shipped in Wave 1 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Studio badges for unsupported AR features" "enhancement,studio" "Shipped in Wave 1 on \`$HEAD\`.")")
fi

if wave_includes 2; then
  CLOSES+=("$(create_if_missing "Polish densify look (splat-feel)" "enhancement,activation" "Shipped in Wave 2 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Studio knobs for Arrive densify" "enhancement,studio,activation" "Shipped in Wave 2 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Brand preview beyond Begin gate" "enhancement,studio" "Shipped in Wave 2 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Persist visitor metrics beyond console" "enhancement,platform" "Shipped in Wave 2 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Visitor AR accessibility pass" "enhancement,platform" "Shipped in Wave 2 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "In-experience share sheet / QR handoff" "enhancement,studio" "Shipped in Wave 2 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Richer pins (links, media, CTAs)" "enhancement,content" "Shipped in Wave 2 on \`$HEAD\`.")")
fi

if wave_includes 3; then
  CLOSES+=("$(create_if_missing "Honor richer mural node types in WebAR" "enhancement,ar,content" "Shipped in Wave 3 on \`$HEAD\` (image node slice).")")
  CLOSES+=("$(create_if_missing "Nodes authoring (add/remove/type/triggers)" "enhancement,studio" "Shipped in Wave 3 on \`$HEAD\`.")")
  CLOSES+=("$(create_if_missing "Support additional experience kinds" "enhancement,content" "Shipped in Wave 3 on \`$HEAD\` (\`experience\` kind).")")
fi

# Deduplicate / drop empties (bash 3 compatible — no associative arrays)
UNIQUE=()
for n in "${CLOSES[@]}"; do
  [[ -z "$n" ]] && continue
  skip=
  for u in "${UNIQUE[@]+"${UNIQUE[@]}"}"; do
    [[ "$u" == "$n" ]] && skip=1 && break
  done
  [[ -n "$skip" ]] && continue
  UNIQUE+=("$n")
done

CLOSE_LINES=""
for n in "${UNIQUE[@]}"; do
  CLOSE_LINES+="Closes #${n}"$'\n'
done

echo "Issues to close:"
printf '  #%s\n' "${UNIQUE[@]}"

PR_URL="$(gh pr list --repo "$REPO" --head "$HEAD" --base "$BASE" --json url -q '.[0].url' 2>/dev/null || true)"

BODY="$(cat <<EOF
## Summary

Enhancement Waves ${WAVES} on \`${HEAD}\`: Arrive hardenments, visitor/Studio delights, and richer mural image nodes + experience kind.

## Closes

${CLOSE_LINES}
## Test plan

- [ ] Arrive densify + tracking grace on device
- [ ] Studio: densify knobs, brand preview tabs, publish readiness
- [ ] Nodes: add image node, upload, publish; visitor sees plane / tap reveal
- [ ] Create \`experience\` kind — no morph chrome
EOF
)"

if [[ -n "$PR_URL" ]]; then
  echo "Updating existing PR: $PR_URL"
  gh pr edit "$PR_URL" --repo "$REPO" --body "$BODY"
else
  echo "Creating PR ${HEAD} → ${BASE}"
  gh pr create --repo "$REPO" --base "$BASE" --head "$HEAD" \
    --title "Enhancement waves ${WAVES}: Arrive, Studio, mural nodes" \
    --body "$BODY"
fi
