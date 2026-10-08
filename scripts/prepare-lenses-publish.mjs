#!/usr/bin/env node
/**
 * Emit a Lenses-ready publish stub from content/untitled-no-7/experience.json.
 * Does not call the Aura API (use npm run publish-lenses for that).
 *
 * Output: content/untitled-no-7/lenses/publish-payload.json
 *
 * gallery is embedded on experience (validateExperience allows extra keys) so
 * Flutter / native can read provenance + shop without a separate bag.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '../..');
const pkgPath = join(root, 'content/untitled-no-7/experience.json');
const outDir = join(root, 'content/untitled-no-7/lenses');
const outPath = join(outDir, 'publish-payload.json');

const exp = JSON.parse(readFileSync(pkgPath, 'utf8'));
const g = exp.gallery;
if (!g) {
  console.error('experience.json missing gallery');
  process.exit(1);
}

const publicHost = (
  process.env.GALLERY_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  ''
)
  .toString()
  .replace(/\/$/, '');
const shopUrl = publicHost
  ? `${publicHost}${g.shop.shopPath || '/shop'}`
  : `https://REPLACE_WITH_VERCEL_HOST${g.shop.shopPath || '/shop'}`;

const galleryForNative = {
  morph: g.morph,
  audio: g.audio,
  provenance: g.provenance,
  shop: {
    experienceSlug: g.shop.experienceSlug,
    shopPath: g.shop.shopPath,
    shopUrl,
    acquireUrl: g.shop.acquireUrl,
  },
  nativeSheet: {
    showAfter: 'firstEnterRawOrDone',
    fields: ['title', 'material', 'dimensions', 'year', 'exhibition'],
    cta: { label: 'Shop this piece', opens: 'shopUrl' },
    morphMode: g.morph?.nativeMode ?? 'hard-cut',
  },
};

const muralExperience = {
  version: 1,
  placement: exp.placement ?? 'merch',
  personOcclusion: !!exp.personOcclusion,
  marker: {
    assetId: exp.marker.assetId,
    physicalWidthM: exp.marker.physicalWidthM,
    ...(exp.marker.trackingAssetId
      ? { trackingAssetId: exp.marker.trackingAssetId }
      : {}),
    ...(exp.marker.mindAssetId ? { mindAssetId: exp.marker.mindAssetId } : {}),
  },
  nodes: exp.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    assetId: n.assetId,
    ...(n.androidAssetId ? { androidAssetId: n.androidAssetId } : {}),
    platforms: n.platforms ?? 'both',
    position: n.position,
    ...(n.rotation ? { rotation: n.rotation } : {}),
    ...(n.scale !== undefined ? { scale: n.scale } : {}),
    ...(n.trigger ? { trigger: n.trigger } : {}),
  })),
  /** Opaque to eng validateExperience — preserved on publish */
  gallery: galleryForNative,
};

const payload = {
  kind: 'mural',
  slug: exp.id,
  title: g.provenance?.title ?? g.title ?? exp.id,
  access: 'public',
  experience: muralExperience,
  /** Mirror for docs / Labs UIs that read extensions */
  extensions: {
    gallery: galleryForNative,
  },
  assetManifest: Object.entries(exp.assets).map(([id, meta]) => {
    const abs = meta.contentPath
      ? join(root, 'content/untitled-no-7', meta.contentPath)
      : null;
    const onDisk = abs ? existsSync(abs) : false;
    return {
      id,
      contentPath: meta.contentPath,
      role: meta.role,
      status:
        meta.status ??
        (onDisk ? 'ready' : 'pending'),
      interim: !!meta.interim,
    };
  }),
  checklist: [
    'Convert finished/raw GLB → USDZ (npm run convert-usdz) and clear assets.*.status pending',
    'Upload GLB/USDZ/audio/overlay/marker via npm run publish-lenses (or Labs)',
    'Marker upload auto-builds tracking twin + .mind when API tools succeed',
    'Set GALLERY_PUBLIC_URL before prepare-lenses so shopUrl is production',
    'POST /v1/publish (publish-lenses) with AURA_LENSES_API_URL + PUBLISH_API_KEY',
    'Deploy same binary hashes to Vercel via npm run sync-content',
    'Staff TestFlight: hard-cut morph → Flutter provenance sheet → Shop CTA',
  ],
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
console.log('Wrote', outPath);
if (!publicHost) {
  console.warn(
    'WARN GALLERY_PUBLIC_URL unset — shopUrl still has REPLACE_WITH_VERCEL_HOST'
  );
}
