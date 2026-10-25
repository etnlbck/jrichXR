/**
 * App config derived from a GalleryExperience package.
 * Seed: content/untitled-no-7/experience.json
 * Runtime: published Blob (via loadExperience) with seed fallback.
 */

import experienceJson from '@repo/content/untitled-no-7/experience.json';
import {
  assetWebPath,
  detectModelNodeId,
  engVecToXr8,
  findNode,
  galleryPins,
  getNodeXr8Placement,
  mediaImageNodes,
  parseGalleryExperience,
  pinColor,
  pinForm,
  resolveBrand,
  supportsMorph,
  type ExperienceKind,
  type GalleryExperience,
  type PinForm,
  type ResolvedBrand,
} from '@jrichforms/experience';

export { DEFAULT_EXPERIENCE_ID } from '@/lib/experience-id';

export type AppPin = {
  id: string;
  title: string;
  body: string;
  position: { x: number; y: number; z: number };
  audioUrl?: string;
  form: PinForm;
  href?: string;
  ctaLabel?: string;
  imageUrl?: string;
};

export type AppMediaNode = {
  id: string;
  url: string;
  /** WebAR honors onDetect (show on lock) and tap (reveal on tap). */
  trigger: 'onDetect' | 'tap';
  placement: ReturnType<typeof getNodeXr8Placement>;
};

export type AppConfig = {
  experienceId: string;
  experienceVersion: string;
  kind: ExperienceKind;
  /** Finished↔raw morph; false for generic `experience` kind. */
  supportsMorph: boolean;
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
  /** Model node shown when the image target is found (trigger onDetect). */
  detectNodeId: string;
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
  /** Extra image planes from mural nodes (not the morph overlay). */
  mediaNodes: AppMediaNode[];
  morph: {
    durationMs: number;
    overlayFadeMs: number;
    webCrossfade: boolean;
    nativeMode: 'hard-cut' | 'crossfade';
  };
  /** Arrive densify (clamped product defaults when gallery.reveal omitted). */
  reveal: {
    densifyMs: number;
    scatterFactor: number;
  };
  audio: {
    unlockOnBegin: boolean;
    playOnFirstEnterRaw: boolean;
  };
  engine: GalleryExperience['engine']['web'];
  maxGlbBytes: number;
  pins: AppPin[];
  /** `#rrggbb` for pin dots and leader lines. */
  pinColor: string;
  brand: ResolvedBrand;
};

export function getSeedExperience(): GalleryExperience {
  return parseGalleryExperience(experienceJson);
}

export function buildAppConfig(experience: GalleryExperience): AppConfig {
  const detectNodeId = detectModelNodeId(experience);
  const finishedPlacement = getNodeXr8Placement(experience, detectNodeId);
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
    kind: experience.kind,
    supportsMorph: supportsMorph(experience),
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
    detectNodeId,
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
    mediaNodes: mediaImageNodes(experience)
      .map((node) => {
        const url = assetWebPath(experience, node.assetId);
        if (!url) return null;
        const trigger =
          node.trigger === 'tap' ? ('tap' as const) : ('onDetect' as const);
        return {
          id: node.id,
          url,
          trigger,
          placement: getNodeXr8Placement(experience, node.id),
        };
      })
      .filter((n): n is AppMediaNode => n !== null),
    morph: {
      durationMs: g.morph.durationMs,
      overlayFadeMs: g.morph.overlayFadeMs,
      webCrossfade: g.morph.webCrossfade,
      nativeMode: g.morph.nativeMode,
    },
    reveal: {
      densifyMs: clamp(
        g.reveal?.densifyMs ?? 1000,
        400,
        3000
      ),
      scatterFactor: clamp(
        g.reveal?.scatterFactor ?? 0.55,
        0.15,
        1.2
      ),
    },
    audio: {
      unlockOnBegin: g.audio.unlockOnBegin,
      playOnFirstEnterRaw: g.audio.playOnFirstEnterRaw,
    },
    engine: experience.engine.web,
    maxGlbBytes: g.maxGlbBytes,
    pins: galleryPins(experience).map((pin) => ({
      id: pin.id,
      title: pin.title,
      body: pin.body,
      position: pin.position,
      audioUrl: pin.audioAssetId
        ? assetWebPath(experience, pin.audioAssetId)
        : undefined,
      form: pinForm(pin),
      href: typeof pin.href === 'string' ? pin.href : undefined,
      ctaLabel: typeof pin.ctaLabel === 'string' ? pin.ctaLabel : undefined,
      imageUrl: typeof pin.imageUrl === 'string' ? pin.imageUrl : undefined,
    })),
    pinColor: pinColor(experience),
    brand: resolveBrand(experience.brand),
  };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Sync seed config — layout metadata / offline fallback. Prefer loadExperience(). */
export const config = buildAppConfig(getSeedExperience());

export const experiencePackage = getSeedExperience();
