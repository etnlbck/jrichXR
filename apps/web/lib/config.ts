/**
 * App config derived from the shared gallery experience package.
 * Source of truth: content/untitled-no-7/experience.json (repo root)
 */

import experienceJson from '@repo/content/untitled-no-7/experience.json';
import {
  assetWebPath,
  engVecToXr8,
  findNode,
  getNodeXr8Placement,
  parseGalleryExperience,
} from '@jrichforms/experience';

const experience = parseGalleryExperience(experienceJson);

const finishedPlacement = getNodeXr8Placement(experience, 'finished');
const overlayNode = findNode(experience, 'overlay');
const overlayPos = overlayNode
  ? engVecToXr8(overlayNode.position, experience.marker.physicalWidthM)
  : {
      x: finishedPlacement.position.x,
      y: finishedPlacement.position.y + 0.2,
      z: finishedPlacement.position.z + 0.05,
    };

const g = experience.gallery;

/**
 * Runtime config for WebAR / shop. Prefer reading `experience` for new code.
 */
export const config = {
  experienceId: experience.id,
  experienceVersion: experience.version,
  physicalWidthM: experience.marker.physicalWidthM,

  piece: {
    title: g.provenance.title,
    material: g.provenance.material,
    dimensions: g.provenance.dimensions,
    year: g.provenance.year,
    exhibition: g.provenance.exhibition,
    acquireUrl: g.shop.acquireUrl,
    shopifyExperienceSlug: g.shop.experienceSlug,
    shopPath: g.shop.shopPath,
    gateTitle: g.title,
  },

  imageTargetName: experience.marker.web.imageTargetName,
  imageTargetJson: experience.marker.web.imageTargetJson,
  printImage: experience.marker.web.printImage,

  assets: {
    finishedModel:
      assetWebPath(experience, 'finished-glb') ?? '/assets/models/finished.glb',
    rawModel: assetWebPath(experience, 'raw-glb') ?? '/assets/models/raw.glb',
    overlay:
      assetWebPath(experience, 'guide-marks') ??
      '/assets/overlays/guide-marks.png',
    narration:
      assetWebPath(experience, 'narration') ?? '/assets/audio/narration.mp3',
    dracoDecoderPath: g.dracoDecoderPath,
    /** Interim raw = duplicate mesh; cool-tint so morph is visible until true raw lands. */
    interimRaw: experience.assets['raw-glb']?.interim === true,
    interimNarration: experience.assets.narration?.interim === true,
  },

  usePlaceholderCube: g.usePlaceholderCube,

  placement: finishedPlacement,

  overlayPlacement: overlayPos,

  morph: {
    durationMs: g.morph.durationMs,
    overlayFadeMs: g.morph.overlayFadeMs,
    webCrossfade: g.morph.webCrossfade,
    nativeMode: g.morph.nativeMode,
  },

  audio: {
    unlockOnBegin: g.audio.unlockOnBegin,
    playOnFirstEnterRaw: g.audio.playOnFirstEnterRaw,
  },

  engine: experience.engine.web,

  maxGlbBytes: g.maxGlbBytes,
} as const;

export type AppConfig = typeof config;

/** Full shared package (eng mural + gallery extension). */
export const experiencePackage = experience;
