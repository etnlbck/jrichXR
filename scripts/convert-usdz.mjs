#!/usr/bin/env node
/**
 * Phase 3 — USDZ twins for Aura Lenses iOS mural nodes.
 *
 * Apple does not ship a reliable CLI on all machines. This script:
 * 1. Checks for finished.glb / raw.glb
 * 2. Looks for xcrun usdz_converter / Reality Converter hints
 * 3. Writes content/untitled-no-7/lenses/USDZ.md with the exact steps
 * 4. Exits 0 if USDZ already present; exits 2 if conversion still needed
 */
import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(fileURLToPath(import.meta.url), '../..');
const content = join(root, 'content/untitled-no-7');
const models = join(content, 'assets/models');
const outDir = join(content, 'lenses');

const pairs = [
  ['finished.glb', 'finished.usdz'],
  ['raw.glb', 'raw.usdz'],
];

function which(cmd) {
  try {
    return execSync(`command -v ${cmd}`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function tryUsdzConverter(glb, usdz) {
  // Legacy Xcode tool (often removed). Reality Converter is the supported GUI path.
  try {
    execSync(`xcrun usdz_converter "${glb}" "${usdz}"`, {
      stdio: 'inherit',
    });
    return existsSync(usdz);
  } catch {
    return false;
  }
}

mkdirSync(outDir, { recursive: true });

const lines = [];
lines.push('# USDZ conversion (iOS native)');
lines.push('');
lines.push('iOS mural models must be `.usdz` (or `.reality`). Android/Web use Draco GLB.');
lines.push('');
lines.push('## Preferred: Reality Converter (Apple)');
lines.push('');
lines.push('1. Install [Reality Converter](https://developer.apple.com/augmented-reality/tools/) from Apple.');
lines.push('2. Open each GLB:');
for (const [glb] of pairs) {
  lines.push(`   - \`${join(models, glb)}\``);
}
lines.push('3. Export USDZ next to the GLB with matching names:');
for (const [, usdz] of pairs) {
  lines.push(`   - \`${join(models, usdz)}\``);
}
lines.push('4. Re-run `npm run convert-usdz` (should report OK) then `npm run check-assets`.');
lines.push('5. Clear `"status": "pending"` on `finished-usdz` / `raw-usdz` in `experience.json`.');
lines.push('');
lines.push('## Keep parity');
lines.push('');
lines.push('- Same origin / up-axis / scale as the GLB pair used on WebAR.');
lines.push('- Prefer embedded textures; avoid external `.png` refs that break after upload.');
lines.push('- Target &lt; 25 MB per USDZ for TestFlight comfort (GLB already Draco &lt; 10 MB).');
lines.push('');

let missing = 0;
let converted = 0;
const converter = which('xcrun');

for (const [glbName, usdzName] of pairs) {
  const glb = join(models, glbName);
  const usdz = join(models, usdzName);
  if (!existsSync(glb)) {
    console.error(`FAIL missing ${glbName}`);
    missing++;
    continue;
  }
  if (existsSync(usdz) && statSync(usdz).size > 1000) {
    const mb = (statSync(usdz).size / (1024 * 1024)).toFixed(2);
    console.log(`OK   ${usdzName}: ${mb} MB`);
    continue;
  }
  if (converter && tryUsdzConverter(glb, usdz)) {
    console.log(`OK   converted ${glbName} → ${usdzName}`);
    converted++;
    continue;
  }
  console.warn(`NEED ${usdzName} — convert ${glbName} in Reality Converter`);
  missing++;
}

writeFileSync(join(outDir, 'USDZ.md'), lines.join('\n') + '\n');
console.log('Wrote', join(outDir, 'USDZ.md'));

if (missing > 0) {
  console.warn(
    `\nconvert-usdz: ${missing} USDZ still needed (Reality Converter). Docs updated.`
  );
  process.exit(2);
}
if (converted) console.log(`convert-usdz: converted ${converted} file(s)`);
console.log('convert-usdz: all USDZ present');
