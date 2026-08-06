/*
 * config.js — single-piece POC configuration.
 * Everything piece-specific lives here so the rest of the code stays generic.
 * Replace placeholder asset paths and metadata with the real sculpture's.
 */
window.JRF_CONFIG = {
  piece: {
    title: 'Untitled No. 7',
    material: 'Black Obsidian — Hand Carved',
    dimensions: '—',            // e.g. '38 × 22 × 20 cm'
    year: '—',
    exhibition: '—',            // e.g. 'RCAA Gallery, Chino Hills'
    acquireUrl: 'https://jrichforms.com',
  },

  // Image target(s): names must match what you register with image-target-cli
  // and load into the engine. Use the wall placard / a printed card — NOT the
  // obsidian surface itself.
  imageTargets: ['jrichforms-placard'],

  assets: {
    finishedModel: 'assets/models/finished.glb',
    rawModel: 'assets/models/raw.glb',
    overlay: 'assets/overlays/guide-marks.png', // transparent PNG from aglitch.art SVG
    narration: 'assets/audio/narration.mp3',
  },

  // Placement of the model relative to the detected marker, in metres.
  // The marker sits on the wall/plinth beside the piece; nudge the model so it
  // reads as floating over the physical work. Tune during Milestone 1.
  placement: {
    position: { x: 0, y: 0.15, z: 0 },
    rotationDeg: { x: 0, y: 0, z: 0 },
    scale: 1.0,                 // world units; depends on your GLB export scale
  },

  morph: {
    durationMs: 1400,           // cross-fade finished -> raw
    overlayFadeMs: 900,
  },
};
