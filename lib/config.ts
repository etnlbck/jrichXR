/**
 * Single-piece POC configuration.
 * Piece-specific values live here so the rest of the app stays generic.
 */
export const config = {
  piece: {
    title: 'Convergence',
    material: 'Black Obsidian — Hand Carved',
    dimensions: '10" H × 6.5" W',
    year: '2026',
    exhibition: '—',
    acquireUrl: 'https://jrichforms.com',
    story:
      'Carved from a single block of black obsidian, working with the stone\u2019s natural fracture lines rather than against them. The final form was found, not imposed.',
    /** Shopify collection handle + experience:{slug} tag for related merch. */
    shopifyExperienceSlug: 'convergence',
  },

  artist: {
    name: 'Jermaine Richards',
    location: 'Southern California',
    bio: 'My artistic process deeply involves the selection and manipulation of natural materials, such as the rich textures of wood and the enduring strength of stone. The result is a collection of unique pieces that seamlessly integrate artistic vision with the inherent essence and beauty found within the natural world.',
    avatar: 'https://designlingo.com/portfolio/images/jrich-profilepic.jpg',
    tags: ['RCAA Gallery', 'Chino Hills', '@jrichforms'],
    instagramUrl: 'https://instagram.com/jrichforms',
    contactEmail: 'jermaine@jrichforms.com',
  },

  previewImage: 'https://designlingo.com/projects/cojv/stone1.png',

  storeUrl: 'https://jrich-xr.vercel.app/shop',

  processVideoUrl: 'https://www.youtube.com/embed/30A3FDWcTxk',

  video: {
    duration: '2:14',
    caption: 'Raw stone to finished form — narrated by the artist.',
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
