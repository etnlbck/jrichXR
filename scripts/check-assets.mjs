#!/usr/bin/env node
/**
 * Phase 2 asset gate for content/untitled-no-7.
 * Exits 1 if required binaries are missing or over maxGlbBytes.
 */
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '../..');
const pkgPath = join(root, 'content/untitled-no-7/experience.json');
const exp = JSON.parse(readFileSync(pkgPath, 'utf8'));
const max = exp.gallery?.maxGlbBytes ?? 10 * 1024 * 1024;
const contentRoot = join(root, 'content/untitled-no-7');

const required = [
  ['finished-glb', true],
  ['raw-glb', true],
  ['guide-marks', true],
  ['narration', true],
  ['marker-display', false],
];

let failed = false;
const notes = [];

for (const [id, requiredFlag] of required) {
  const meta = exp.assets?.[id];
  if (!meta?.contentPath) {
    if (requiredFlag) {
      console.error(`FAIL ${id}: missing contentPath in experience.json`);
      failed = true;
    }
    continue;
  }
  const abs = join(contentRoot, meta.contentPath);
  if (!existsSync(abs)) {
    if (requiredFlag) {
      console.error(`FAIL ${id}: missing file ${meta.contentPath}`);
      failed = true;
    } else {
      console.warn(`WARN ${id}: missing optional ${meta.contentPath}`);
    }
    continue;
  }
  const size = statSync(abs).size;
  const mb = (size / (1024 * 1024)).toFixed(2);
  const over = id.endsWith('-glb') && size > max;
  if (over) {
    console.error(
      `FAIL ${id}: ${mb} MB exceeds maxGlbBytes (${(max / (1024 * 1024)).toFixed(1)} MB)`
    );
    failed = true;
  } else {
    console.log(
      `OK   ${id}: ${mb} MB${meta.interim ? ' (interim)' : ''}`
    );
  }
  if (meta.interim) notes.push(`${id} is interim — replace before gallery open`);
}

const w = exp.marker?.physicalWidthM;
if (!(typeof w === 'number' && w > 0 && w < 2)) {
  console.error(`FAIL marker.physicalWidthM invalid: ${w}`);
  failed = true;
} else {
  console.log(
    `OK   physicalWidthM: ${w} m (${(w * 100).toFixed(1)} cm) — verify with ruler on print`
  );
}

if (exp.gallery?.usePlaceholderCube) {
  console.warn('WARN gallery.usePlaceholderCube is true');
}

for (const usdzId of ['finished-usdz', 'raw-usdz']) {
  const meta = exp.assets?.[usdzId];
  const abs = meta?.contentPath
    ? join(contentRoot, meta.contentPath)
    : null;
  if (!abs || !existsSync(abs)) {
    console.warn(
      `WARN ${usdzId}: missing (Phase 3 iOS) — npm run convert-usdz`
    );
  } else {
    const mb = (statSync(abs).size / (1024 * 1024)).toFixed(2);
    console.log(`OK   ${usdzId}: ${mb} MB`);
  }
}

for (const n of notes) console.warn(`NOTE ${n}`);

if (failed) {
  console.error('\ncheck-assets: FAILED');
  process.exit(1);
}
console.log('\ncheck-assets: PASSED (replace interim assets when ready)');
