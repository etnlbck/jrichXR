/**
 * App config derived from a GalleryExperience package.
 * Seed: content/untitled-no-7/experience.json
 * Runtime: published Blob (via loadExperience) with seed fallback.
 */

import experienceJson from '@repo/content/untitled-no-7/experience.json';
import {
  assetWebPath,
  engVecToXr8,
  findNode,
  getNodeXr8Placement,
  parseGalleryExperience,
  type GalleryExperience,
} from '@jrichforms/experience';

export { DEFAULT_EXPERIENCE_ID } from '@/lib/experience-id';

export type AppConfig = {
  experienceId: string;
  experienceVersion: string;
  physicalWidthM: number;
  piece: {
    title: string;
    material: string;
    dimensions: string;
    year: string;
    exhibition: string;
    acquireUrl: string;
    shopifyExperienceSlug: string;
    shopPath: string;
    gateTitle: string;
  };
  imageTargetName: string;
  imageTargetJson: string;
  printImage: string;
  assets: {
    finishedModel: string;
    rawModel: string;
    overlay: string;
    narration: string;
    dracoDecoderPath: string;
    interimRaw: boolean;
    interimNarration: boolean;
  };
  usePlaceholderCube: boolean;
  placement: ReturnType<typeof getNodeXr8Placement>;
  overlayPlacement: { x: number; y: number; z: number };
  morph: {
    durationMs: number;
    overlayFadeMs: number;
    webCrossfade: boolean;
    nativeMode: 'hard-cut' | 'crossfade';
  };
  audio: {
    unlockOnBegin: boolean;
    playOnFirstEnterRaw: boolean;
  };
  engine: GalleryExperience['engine']['web'];
  maxGlbBytes: number;
};

export function getSeedExperience(): GalleryExperience {
  return parseGalleryExperience(experienceJson);
}

export function buildAppConfig(experience: GalleryExperience): AppConfig {
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

  return {
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
        assetWebPath(experience, 'finished-glb') ??
        '/assets/models/finished.glb',
      rawModel:
        assetWebPath(experience, 'raw-glb') ?? '/assets/models/raw.glb',
      overlay:
        assetWebPath(experience, 'guide-marks') ??
        '/assets/overlays/guide-marks.png',
      narration:
        assetWebPath(experience, 'narration') ??
        '/assets/audio/narration.mp3',
      dracoDecoderPath: g.dracoDecoderPath,
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
  };
}

/** Sync seed config — layout metadata / offline fallback. Prefer loadExperience(). */
export const config = buildAppConfig(getSeedExperience());

export const experiencePackage = getSeedExperience();
