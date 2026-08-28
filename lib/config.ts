/**
 * Single-piece POC configuration.
 * Piece-specific values live here so the rest of the app stays generic.
 */
export const config = {
  piece: {
    title: 'Untitled No. 7',
    material: 'Black Obsidian — Hand Carved',
    dimensions: '—',
    year: '—',
    exhibition: '—',
    acquireUrl: 'https://jrichforms.com',
    /** Shopify collection handle + experience:{slug} tag for related merch. */
    shopifyExperienceSlug: 'untitled-no-7',
  },

  /** Must match the name used when generating the target with image-target-cli. */
  imageTargetName: 'jrichforms-placard',
  imageTargetJson: '/assets/targets/jrichforms-placard.json',

  assets: {
    finishedModel: '/assets/models/finished.glb',
    rawModel: '/assets/models/raw.glb',
    overlay: '/assets/overlays/guide-marks.png',
    narration: '/assets/audio/narration.mp3',
    dracoDecoderPath: '/draco/',
  },

  /**
   * When true (or when GLBs 404), show a colored cube for Milestone 0 de-risk.
   * Flip to false once finished.glb is in place.
   */
  usePlaceholderCube: true,

  placement: {
    position: { x: 0, y: 0.15, z: 0 },
    rotationDeg: { x: 0, y: 0, z: 0 },
    scale: 1.0,
  },

  morph: {
    durationMs: 1400,
    overlayFadeMs: 900,
  },

  engine: {
    /** Binary chunk required for image targets with @8thwall/engine-binary. */
    preloadChunks: 'slam' as const,
    xrScript: '/xr/engine/xr.js',
    xrextrasScript: '/xr/xrextras/xrextras.js',
    landingPageScript: '/xr/landing-page/landing-page.js',
  },
} as const;

export type AppConfig = typeof config;
