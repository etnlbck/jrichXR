/**
 * Copy the 8th Wall engine binary into apps/web/public/xr for static serving.
 * Runs on postinstall so Vercel deploys include the WASM/chunks.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'web', 'public', 'xr');

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

// Loading, permission and error screens are our own; drop helper copies
// left over from installs that still shipped XRExtras and the landing page.
for (const stale of ['xrextras', 'landing-page']) {
  rmSync(join(outDir, stale), { recursive: true, force: true });
}

// Manifest for debugging deploys
const listing = existsSync(outDir) ? readdirSync(outDir) : [];
writeFileSync(
  join(outDir, 'COPY_MANIFEST.json'),
  JSON.stringify({ copiedAt: new Date().toISOString(), listing }, null, 2)
);
console.log('[copy-xr] done', listing);
