import { ImageResponse } from 'next/og';
import { config } from '@/lib/config';

export const alt = 'TagXR, The Stone Speaks Spatially';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  const title = config.piece.gateTitle;
  const piece = config.piece.title;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'radial-gradient(120% 100% at 20% 0%, #1a2248 0%, #0a0a0c 55%, #000 100%)',
          color: '#ffffff',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 2,
            color: '#21d3d5',
            textTransform: 'uppercase',
          }}
        >
          TagXR
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ fontSize: 32, opacity: 0.75 }}>{piece}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, opacity: 0.65 }}>
          Scan a marker. Morph the stone. No app install.
        </div>
      </div>
    ),
    { ...size }
  );
}
