#!/usr/bin/env node
/**
 * Copy content/untitled-no-7/assets → apps/web/public/assets (dual-publish web half).
 * Skips missing sources; never deletes public targets JSON.
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '../..');
const srcRoot = join(root, 'content/untitled-no-7/assets');
const destRoot = join(root, 'apps/web/public/assets');

const MAP = [
  ['models/finished.glb', 'models/finished.glb'],
  ['models/raw.glb', 'models/raw.glb'],
  ['models/finished.usdz', 'models/finished.usdz'],
  ['models/raw.usdz', 'models/raw.usdz'],
  ['overlays/guide-marks.png', 'overlays/guide-marks.png'],
  ['audio/narration.mp3', 'audio/narration.mp3'],
  ['marker/display.png', 'targets/jrichforms-placard_cropped.png'],
];

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

let copied = 0;
let skipped = 0;

for (const [fromRel, toRel] of MAP) {
  const from = join(srcRoot, fromRel);
  const to = join(destRoot, toRel);
  if (!existsSync(from)) {
    skipped += 1;
    console.log(`skip (missing): ${fromRel}`);
    continue;
  }
  ensureDir(to);
  copyFileSync(from, to);
  copied += 1;
  console.log(`copy ${fromRel} → apps/web/public/assets/${toRel}`);
}

console.log(`sync-content: ${copied} copied, ${skipped} skipped`);
