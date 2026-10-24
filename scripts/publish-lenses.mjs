#!/usr/bin/env node
/**
 * Upload untitled-no-7 assets to Aura Lenses and POST /v1/publish.
 *
 * Env:
 *   AURA_LENSES_API_URL  e.g. https://api.example.com
 *   PUBLISH_API_KEY      x-api-key with publisher role
 *   GALLERY_PUBLIC_URL   optional; used by prepare-lenses for shopUrl
 *   DRY_RUN=1            prepare + print plan only
 *
 * Marker uploads with kind=marker trigger tracking twin + mind when the API
 * tools succeed; those ids are written back into the experience marker.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(fileURLToPath(import.meta.url), '../..');
const contentRoot = join(root, 'content/untitled-no-7');
const expPath = join(contentRoot, 'experience.json');
const outDir = join(contentRoot, 'lenses');
const dryRun = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

const apiBase = (process.env.AURA_LENSES_API_URL || '').replace(/\/$/, '');
const apiKey = process.env.PUBLISH_API_KEY || '';

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (!dryRun && (!apiBase || !apiKey)) {
  die(
    'Set AURA_LENSES_API_URL and PUBLISH_API_KEY (or DRY_RUN=1 to preview).'
  );
}

console.log('Running prepare-lenses…');
execSync('node scripts/prepare-lenses-publish.mjs', {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

const exp = JSON.parse(readFileSync(expPath, 'utf8'));
const payload = JSON.parse(
  readFileSync(join(outDir, 'publish-payload.json'), 'utf8')
);

/** @type {Record<string, { kind: string; path: string; required: boolean }>} */
const uploadPlan = {
  'marker-display': {
    kind: 'marker',
    path: exp.assets['marker-display']?.contentPath,
    required: true,
  },
  'finished-glb': {
    kind: 'model',
    path: exp.assets['finished-glb']?.contentPath,
    required: true,
  },
  'raw-glb': {
    kind: 'model',
    path: exp.assets['raw-glb']?.contentPath,
    required: true,
  },
  'finished-usdz': {
    kind: 'model',
    path: exp.assets['finished-usdz']?.contentPath,
    required: false,
  },
  'raw-usdz': {
    kind: 'model',
    path: exp.assets['raw-usdz']?.contentPath,
    required: false,
  },
  'guide-marks': {
    kind: 'image',
    path: exp.assets['guide-marks']?.contentPath,
    required: true,
  },
  narration: {
    kind: 'audio',
    path: exp.assets['narration']?.contentPath,
    required: true,
  },
};

async function uploadFile(localId, kind, absPath, lensId) {
  const buf = readFileSync(absPath);
  const filename = basename(absPath);
  const form = new FormData();
  form.append('file', new Blob([buf]), filename);
  form.append('kind', kind);
  if (lensId) form.append('lensId', lensId);

  const res = await fetch(`${apiBase}/v1/admin/assets/upload`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`upload ${localId} failed ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  const idMap = {};
  let trackingAssetId = null;
  let mindAssetId = null;

  console.log('\nUpload plan:');
  for (const [localId, plan] of Object.entries(uploadPlan)) {
    const abs = plan.path ? join(contentRoot, plan.path) : null;
    const ok = abs && existsSync(abs);
    console.log(
      `  ${localId}: kind=${plan.kind} ${ok ? 'ready' : plan.required ? 'MISSING' : 'skip'}`
    );
    if (plan.required && !ok) die(`Missing required asset file for ${localId}`);
  }

  if (dryRun) {
    console.log('\nDRY_RUN — not uploading or publishing.');
    console.log('Payload slug:', payload.slug);
    console.log(
      'experience.gallery.shop.shopUrl:',
      payload.experience?.gallery?.shop?.shopUrl
    );
    return;
  }

  // Optional: create/update lens shell first so uploads can attach lensId
  let lensId = null;
  for (const [localId, plan] of Object.entries(uploadPlan)) {
    const abs = join(contentRoot, plan.path);
    if (!existsSync(abs)) {
      console.warn(`skip ${localId} (file missing)`);
      continue;
    }
    console.log(`Uploading ${localId}…`);
    const result = await uploadFile(localId, plan.kind, abs, lensId);
    idMap[localId] = result.id;
    if (result.trackingAssetId) trackingAssetId = result.trackingAssetId;
    if (result.mindAssetId) mindAssetId = result.mindAssetId;
    console.log(
      `  → ${result.id}` +
        (result.trackingAssetId ? ` track=${result.trackingAssetId}` : '') +
        (result.mindAssetId ? ` mind=${result.mindAssetId}` : '')
    );
  }

  const experience = structuredClone(payload.experience);
  const resolve = (localId) => idMap[localId] || localId;

  experience.marker.assetId = resolve(experience.marker.assetId);
  if (trackingAssetId) experience.marker.trackingAssetId = trackingAssetId;
  if (mindAssetId) experience.marker.mindAssetId = mindAssetId;

  experience.nodes = experience.nodes.map((n) => ({
    ...n,
    assetId: resolve(n.assetId),
    ...(n.androidAssetId
      ? { androidAssetId: resolve(n.androidAssetId) }
      : {}),
  }));

  // If USDZ missing, point iOS assetId at GLB twins so publish validates;
  // RealityKit still needs real USDZ for a good TestFlight — see USDZ.md.
  for (const n of experience.nodes) {
    if (n.type !== 'model') continue;
    if (!idMap[n.assetId] && n.androidAssetId && idMap['finished-glb']) {
      /* assetIds already remapped to UUIDs when present */
    }
  }

  const publishBody = {
    kind: 'mural',
    slug: payload.slug,
    title: payload.title,
    access: payload.access || 'public',
    experience,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'last-publish-body.json'),
    JSON.stringify({ ...publishBody, _idMap: idMap }, null, 2) + '\n'
  );

  console.log('\nPublishing…');
  const res = await fetch(`${apiBase}/v1/publish`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(publishBody),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  writeFileSync(
    join(outDir, 'last-publish-response.json'),
    JSON.stringify(json, null, 2) + '\n'
  );
  if (!res.ok) {
    die(`publish failed ${res.status}: ${text}`);
  }
  console.log('Published', json.id || json.lensId || json.slug || json);
  console.log('Asset id map written to lenses/last-publish-body.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
