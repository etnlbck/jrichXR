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
  extraModelNodes,
  findNode,
  galleryPins,
  getNodeXr8Placement,
  mediaAudioNodes,
  mediaImageNodes,
  mediaVideoNodes,
  parseGalleryExperience,
  pinColor,
  pinForm,
  resolveBrand,
  runtimeTrigger,
  supportsMorph,
  type ExperienceKind,
  type GalleryExperience,
  type MuralNodeTrigger,
  type PinForm,
  type PinAction,
  type PinStyle,
  type ResolvedBrand,
  type ShareTargetId,
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
  style: PinStyle;
  action: PinAction;
};

export type AppMediaNode = {
  id: string;
  url: string;
  /** WebAR honors onDetect / tap / loop / proximity. */
  trigger: MuralNodeTrigger;
  placement: ReturnType<typeof getNodeXr8Placement>;
};

export type AppAudioNode = {
  id: string;
  url: string;
  trigger: MuralNodeTrigger;
  placement: ReturnType<typeof getNodeXr8Placement>;
};

export type AppExtraModel = {
  id: string;
  url: string;
  trigger: MuralNodeTrigger;
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
  videoNodes: AppMediaNode[];
  audioNodes: AppAudioNode[];
  extraModels: AppExtraModel[];
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
    stingUrl?: string;
    haptics: boolean;
  };
  /** Share intents; empty = copy/Web Share only. */
  shareTargets: ShareTargetId[];
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
        return {
          id: node.id,
          url,
          trigger: runtimeTrigger(node),
          placement: getNodeXr8Placement(experience, node.id),
        };
      })
      .filter((n): n is AppMediaNode => n !== null),
    videoNodes: mediaVideoNodes(experience)
      .map((node) => {
        const url = assetWebPath(experience, node.assetId);
        if (!url) return null;
        return {
          id: node.id,
          url,
          trigger: runtimeTrigger(node),
          placement: getNodeXr8Placement(experience, node.id),
        };
      })
      .filter((n): n is AppMediaNode => n !== null),
    audioNodes: mediaAudioNodes(experience)
      .map((node) => {
        const url = assetWebPath(experience, node.assetId);
        if (!url) return null;
        return {
          id: node.id,
          url,
          trigger: runtimeTrigger(node),
          placement: getNodeXr8Placement(experience, node.id),
        };
      })
      .filter((n): n is AppAudioNode => n !== null),
    extraModels: extraModelNodes(experience)
      .map((node) => {
        const url = assetWebPath(experience, node.assetId);
        if (!url) return null;
        return {
          id: node.id,
          url,
          trigger: runtimeTrigger(node),
          placement: getNodeXr8Placement(experience, node.id),
        };
      })
      .filter((n): n is AppExtraModel => n !== null),
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
      stingUrl:
        typeof g.reveal?.stingUrl === 'string' && g.reveal.stingUrl
          ? g.reveal.stingUrl
          : undefined,
      haptics: g.reveal?.haptics === true,
    },
    shareTargets: normalizeShareTargets(g.shareTargets),
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
      style: pin.style === 'cta' ? ('cta' as const) : ('dot' as const),
      action:
        pin.action === 'video' || pin.action === 'form'
          ? pin.action
          : ('link' as const),
    })),
    pinColor: pinColor(experience),
    brand: resolveBrand(experience.brand),
  };
}

const DEFAULT_SHARE_TARGETS: ShareTargetId[] = ['whatsapp', 'x', 'email'];

function normalizeShareTargets(
  raw: GalleryExperience['gallery']['shareTargets']
): ShareTargetId[] {
  if (raw === undefined) return [...DEFAULT_SHARE_TARGETS];
  if (!Array.isArray(raw)) return [...DEFAULT_SHARE_TARGETS];
  const allowed = new Set<ShareTargetId>(['whatsapp', 'x', 'email']);
  return raw.filter((t): t is ShareTargetId => allowed.has(t as ShareTargetId));
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Sync seed config — layout metadata / offline fallback. Prefer loadExperience(). */
export const config = buildAppConfig(getSeedExperience());

export const experiencePackage = getSeedExperience();
