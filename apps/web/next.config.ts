import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, '../..');

// #region agent log
const _agentDbg = {
  sessionId: '88764b',
  runId: process.env.VERCEL ? 'vercel-post-rootdir' : 'local',
  hypothesisId: 'C',
  location: 'apps/web/next.config.ts',
  message: 'Next config load after rootDirectory=apps/web fix',
  data: {
    cwd: process.cwd(),
    appDir,
    monorepoRoot,
    vercel: Boolean(process.env.VERCEL),
    expectedManifest: path.join(appDir, '.next', 'routes-manifest.json'),
    hasOutputFileTracingRoot: true,
  },
  timestamp: Date.now(),
};
console.log('[debug-88764b]', JSON.stringify(_agentDbg));
fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Debug-Session-Id': '88764b',
  },
  body: JSON.stringify(_agentDbg),
}).catch(() => {});
// #endregion

const nextConfig: NextConfig = {
  transpilePackages: ['@jrichforms/experience'],
  // Trace content/ + packages/* when Vercel Root Directory is apps/web.
  outputFileTracingRoot: monorepoRoot,
  // Keep Turbopack resolution aligned with the monorepo root (avoids path doubling).
  turbopack: {
    root: monorepoRoot,
  },

  // Engine WASM/chunks and GLBs must be served with correct MIME types on Vercel.
  async headers() {
    return [
      {
        source: '/xr/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.wasm',
        headers: [{ key: 'Content-Type', value: 'application/wasm' }],
      },
      {
        source: '/:path*.glb',
        headers: [{ key: 'Content-Type', value: 'model/gltf-binary' }],
      },
      {
        source: '/:path*.gltf',
        headers: [{ key: 'Content-Type', value: 'model/gltf+json' }],
      },
    ];
  },
};

export default nextConfig;
