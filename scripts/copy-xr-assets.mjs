/**
 * Copy 8th Wall engine binary + helpers into public/xr for static serving.
 * Runs on postinstall so Vercel deploys include the WASM/chunks.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'xr');

function resolvePkg(name) {
  return dirname(require.resolve(`${name}/package.json`));
}

function copyDir(from, to) {
  if (!existsSync(from)) {
    console.warn(`[copy-xr] skip missing: ${from}`);
    return false;
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[copy-xr] ${from} -> ${to}`);
  return true;
}

mkdirSync(outDir, { recursive: true });

const enginePkg = resolvePkg('@8thwall/engine-binary');
const engineDist = join(enginePkg, 'dist');
copyDir(engineDist, join(outDir, 'engine'));

// XRExtras may ship as dist/ or a single bundle — copy whatever exists.
const extrasPkg = resolvePkg('@8thwall/xrextras');
for (const candidate of ['dist', 'build', '']) {
  const src = candidate ? join(extrasPkg, candidate) : extrasPkg;
  if (existsSync(join(src, 'xrextras.js')) || existsSync(join(src, 'index.js'))) {
    copyDir(src, join(outDir, 'xrextras'));
    break;
  }
}

try {
  const landingPkg = resolvePkg('@8thwall/landing-page');
  for (const candidate of ['dist', 'build', '']) {
    const src = candidate ? join(landingPkg, candidate) : landingPkg;
    if (existsSync(src)) {
      copyDir(src, join(outDir, 'landing-page'));
      break;
    }
  }
} catch {
  console.warn('[copy-xr] @8thwall/landing-page not installed');
}

// Manifest for debugging deploys
const listing = existsSync(outDir) ? readdirSync(outDir) : [];
writeFileSync(
  join(outDir, 'COPY_MANIFEST.json'),
  JSON.stringify({ copiedAt: new Date().toISOString(), listing }, null, 2)
);
console.log('[copy-xr] done', listing);
