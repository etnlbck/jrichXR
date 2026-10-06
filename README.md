# JRichForms XR — Proof of Concept

Web AR for a black-obsidian sculpture: scan a marker beside the piece → the finished 3D model appears anchored → tap to morph to the raw, guide-marked stone while the artist narrates. No app install. Runs in mobile Safari/Chrome.

**Stack:** npm workspaces monorepo · Next.js (App Router) on Vercel · [8th Wall](https://8thwall.org) engine · Three.js.

**Shared experience:** [`content/untitled-no-7/`](content/untitled-no-7/) — eng-compatible mural JSON + gallery extension, typed by [`packages/experience`](packages/experience) (`@jrichforms/experience`). Consumed by WebAR and (via publish scripts) external Aura Lenses native / MindAR.

See **[BUILD-PLAN.md](BUILD-PLAN.md)** for dual-runtime architecture, **[ASSETS.md](ASSETS.md)** for capture, **[LICENSING.md](LICENSING.md)** for engine license notes.

## Status

1. Engine + XRExtras + Landing Page copied to `apps/web/public/xr/` on `npm install`.
2. Image target under `apps/web/public/assets/targets/` (print cropped PNG via `/marker`).
3. Experience package drives config (`apps/web/lib/config.ts` ← `experience.json` + `@jrichforms/experience`).
4. Phase 2 assets: Draco `finished.glb`, interim tinted `raw.glb`, overlay; placeholder off. Run `npm run check-assets`. Replace interim raw + narration; measure print width → `physicalWidthM` ([PHASE2.md](content/untitled-no-7/PHASE2.md)).
5. Headless Shopify at `/shop` (Inquire fallback if Storefront not configured).

## Monorepo layout

```
content/untitled-no-7/     Shared experience package (source of truth)
packages/experience/       @jrichforms/experience — mural + gallery types/helpers
apps/web/                  @jrichforms/web — Next.js App Router WebAR + /shop
  app/ components/ lib/
  public/xr/               Engine runtime (postinstall)
  public/assets/           Synced from content/
scripts/                   sync-content, prepare-lenses, check-assets, …
```

Aura Lenses / Labs stay **external** — this repo does not vendor those apps.

## Running locally

```bash
npm install
npm run sync-content   # if you changed content assets
npm run dev            # → @jrichforms/web
```

Env: root [`.env.local`](.env.local) is symlinked to `apps/web/.env.local` for Next.

- AR: `http://localhost:3000`
- Shop: `http://localhost:3000/shop`
- Printable marker: `http://localhost:3000/marker`

Camera on a phone needs HTTPS — use a Vercel preview or `npx ngrok http 3000`.

```bash
npm run make-target      # regenerate test marker JSON
npm run convert-meshy    # Meshy OBJ → content finished.glb
npm run prepare-lenses   # write lenses/publish-payload.json
npm run check-assets     # Phase 2 size / presence gate
npm run convert-usdz     # USDZ checklist / Reality Converter
```

## Deploying (Vercel)

Vercel Root Directory is **`apps/web`** (see root [`vercel.json`](vercel.json) `rootDirectory`). Install/build run from the monorepo root via `cd ../.. && npm install` / `npm run build -w @jrichforms/web`.

`postinstall` copies the engine and runs `sync-content` into `apps/web/public`.

MIME / cache headers for WASM and GLB are set in [`apps/web/next.config.ts`](apps/web/next.config.ts).

## Aura Lenses (native / MindAR)

Visitor-facing path stays this WebAR QR. For staff demo (external Aura repos):

1. Fill USDZ twins + tracking twin / `.mind` (see [`content/untitled-no-7/lenses/`](content/untitled-no-7/lenses/)).
2. `npm run prepare-lenses` / `npm run publish-lenses` against the Lenses API.
3. Native: hard-cut morph + Flutter provenance sheet → Shop opens this site’s `/shop`.

Release sync: [`content/untitled-no-7/RELEASE.md`](content/untitled-no-7/RELEASE.md).

## Admin CMS

Password-gated editor at `/admin` — list, create, and draft/publish experience packages to **Vercel Blob** (metadata, nodes, GLB/overlay/audio/marker uploads). `/` is Untitled No. 7 (published Blob, else repo `content/` seed). Other published packages are `/e/{id}` and `/e/{id}/shop`.

```bash
# apps/web/.env.local (or Vercel project env)
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_SESSION_SECRET=long-random-string
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_…   # from Vercel → Storage → Blob
```

1. Create a Blob store on the Vercel project and pull env locally (`vercel env pull`).
2. Open `/admin/login`, sign in. Edit Untitled No. 7 at `/admin/untitled-no-7`, or **Create** a new slug (clones the seed package).
3. Upload assets, **Publish**. Visitors open new pieces at `/e/{slug}`.
4. Repo `content/untitled-no-7/` remains the git seed; production edits do not write git.

Aura Lenses dual-publish is still via `prepare-lenses` / external API (Export JSON from admin helps).

## Shopify (headless)

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_headless_storefront_token
# optional:
SHOPIFY_API_VERSION=2024-01
```

Use the **Headless Storefront** token (not Admin `shpat_`). Tag products `experience:untitled-no-7` (see `gallery.shop.experienceSlug` in the package). WebAR ships with Inquire fallback until merch is ready.

## Scale field test

1. Measure printed placard width → set `marker.physicalWidthM` in `experience.json`.
2. Photo WebAR next to a ruler; confirm model scale before Aura native parity checks.

## License

App scaffold: MIT (see `LICENSE`). 8th Wall engine binary and helpers: see `LICENSING.md`.
