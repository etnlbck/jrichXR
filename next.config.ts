import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
