/**
 * Non-interactive image-target generation for the POC test marker.
 * Usage: node scripts/make-test-target.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Import ESM apply helpers from the CLI package
const { applyCrop } = await import(
  join(root, 'node_modules/@8thwall/image-target-cli/src/apply.js')
);
const { getDefaultCrop } = await import(
  join(root, 'node_modules/@8thwall/image-target-cli/src/crop.js')
);

const name = 'jrichforms-placard';
const src = join(root, 'scripts/tmp/test-marker.png');
const outDir = join(root, 'public/assets/targets');

const rawImage = sharp(src);
const meta = await rawImage.metadata();
const geometry = getDefaultCrop(
  { width: meta.width, height: meta.height },
  false
);

await applyCrop(rawImage, { type: 'PLANAR', geometry }, outDir, name, true);

// Fix imagePath so the engine fetches from our Next public URL
const fs = await import('node:fs/promises');
const jsonPath = join(outDir, `${name}.json`);
const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
data.imagePath = `/assets/targets/${data.resources.luminanceImage}`;
await fs.writeFile(jsonPath, `${JSON.stringify(data, null, 2)}\n`);

console.log('Wrote target to', jsonPath);
console.log('imagePath =', data.imagePath);
