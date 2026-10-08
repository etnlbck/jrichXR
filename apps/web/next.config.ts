import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, '../..');

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
