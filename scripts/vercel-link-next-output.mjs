#!/usr/bin/env node
/**
 * When Vercel Root Directory is the monorepo root, the Next builder looks for
 * `.next/routes-manifest.json` at the repo root. Workspace builds write to
 * `apps/web/.next` — copy that output to the root so deploy can finish.
 */
import { cpSync, existsSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '../..');
const src = join(root, 'apps/web/.next');
const dest = join(root, '.next');
const manifest = join(src, 'routes-manifest.json');

// #region agent log
const logPath = join(root, '.cursor/debug-88764b.log');
const payload = {
  sessionId: '88764b',
  runId: process.env.VERCEL ? 'vercel' : 'local',
  hypothesisId: 'A',
  location: 'scripts/vercel-link-next-output.mjs',
  message: 'link apps/web/.next → repo-root .next',
  data: {
    src,
    dest,
    srcManifestExists: existsSync(manifest),
    vercel: Boolean(process.env.VERCEL),
  },
  timestamp: Date.now(),
};
try {
  appendFileSync(logPath, `${JSON.stringify(payload)}\n`);
} catch {
  /* ignore local log write failures on Vercel */
}
console.log('[debug-88764b]', JSON.stringify(payload));
// #endregion

if (!existsSync(manifest)) {
  console.error(
    `vercel-link-next-output: missing ${manifest}. Did the web workspace build succeed?`
  );
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log('vercel-link-next-output: copied apps/web/.next → .next');
