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
- Desktop stand-in (model, pins, morph, sheets — no camera): `http://localhost:3000/?stage=1`
- Shop: `http://localhost:3000/shop`
- Printable marker: `http://localhost:3000/marker`

Phone camera needs a real HTTPS certificate. Install the tunnel once, then start it with the dev server:

```bash
brew install cloudflared
npm run dev:phone
```

The command prints `https://….trycloudflare.com`. Open that on the phone, tap Begin, and point at the marker from `/marker`. The address changes every time you start the command, and the dev server is reachable on the internet until you stop it. Iterate the viewer at `http://localhost:3000/?stage=1` first. If the phone misses a hot reload, refresh the page.

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

Clerk-gated artist studio at `/admin` — list, create, and draft/publish experience packages to **Vercel Blob** (metadata, nodes, GLB/overlay/audio/marker uploads). `/` is Untitled No. 7 (published Blob, else repo `content/` seed). Other published packages are `/e/{id}` and `/e/{id}/shop`. Public AR and shop stay unauthenticated.

```bash
# apps/web/.env.local (or Vercel project env)
# Clerk — provision via `vercel integration add clerk`, then `vercel env pull`
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/admin/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/admin
ARTIST_ACCESS=signed_in
# optional: comma-separated Clerk user ids that always act as studio admin
# CLERK_ADMIN_USER_IDS=user_…
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_…   # from Vercel → Storage → Blob
```

1. Create a Blob store on the Vercel project and pull env locally (`vercel env pull`).
2. Open `/admin/sign-in` (or `/admin/sign-up`). Any signed-in user can create pieces while `ARTIST_ACCESS=signed_in`. Each artist only sees and edits pieces they created. Untitled No. 7 and older Blob packages with no `experiences/{id}/access.json` stay studio-owned (admin only).
3. Mark a studio admin in Clerk **Users → public metadata**: `{ "role": "admin" }`, or put their user id in `CLERK_ADMIN_USER_IDS`. Admins see every piece, including Untitled No. 7.
4. When you are ready to whitelist: set `ARTIST_ACCESS=allowlist` and set `publicMetadata.role` to `artist` or `admin` on approved users. Everyone else lands on `/admin/pending`. Optionally also enable Clerk Dashboard → **Restrictions → Allowlist** (or invitations-only) so unknown emails cannot create an account. The env switch is what gates the studio.
5. Add a session-token claim in Clerk (**Sessions → Customize session token**): `{ "metadata": "{{user.public_metadata}}" }` so allowlist checks can read `role` without an extra Clerk API call.
6. Upload assets, **Publish**. Visitors open new pieces at `/e/{slug}`.
7. **Archive** hides a piece from visitors (`/e/{slug}` 404s) but keeps Blob files. Restore from the Archived list, or **Delete permanently** (type the slug to confirm). Untitled No. 7 cannot be archived or deleted.
8. Repo `content/untitled-no-7/` remains the git seed; production edits do not write git.

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
