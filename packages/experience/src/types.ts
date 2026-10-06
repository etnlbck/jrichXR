/**
 * Local mirror of Aura eng mural shapes + jrichforms gallery extension.
 * Sync with @aura-lenses/eng when publishing to Lenses.
 */

export type MuralNodeType = 'image' | 'video' | 'model' | 'audio' | 'gltf';
export type MuralNodeTrigger = 'onDetect' | 'tap' | 'loop' | 'proximity';
export type MuralPlacement = 'wall' | 'merch';

export interface MuralVec3 {
  x: number;
  y: number;
  z: number;
}

export interface MuralNode {
  id: string;
  type: MuralNodeType;
  assetId: string;
  androidAssetId?: string;
  platforms?: 'both' | 'ios' | 'android';
  position: MuralVec3;
  rotation?: MuralVec3;
  scale?: MuralVec3 | number;
  trigger?: MuralNodeTrigger;
}

export interface ExperienceAssetRef {
  webPath?: string;
  contentPath?: string;
  role?: string;
  status?: 'ready' | 'pending' | string;
  /** True when file is a stand-in (e.g. raw = copy of finished). */
  interim?: boolean;
}

export interface GalleryProvenance {
  title: string;
  material: string;
  dimensions: string;
  year: string;
  exhibition: string;
}

export interface GalleryExtension {
  title: string;
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
  provenance: GalleryProvenance;
  shop: {
    experienceSlug: string;
    shopPath: string;
    acquireUrl: string;
  };
  stateMachine: string[];
  usePlaceholderCube: boolean;
  dracoDecoderPath: string;
  maxGlbBytes: number;
}

export interface GalleryExperience {
  id: string;
  version: string;
  kind: 'mural';
  placement?: MuralPlacement;
  personOcclusion?: boolean;
  marker: {
    assetId: string;
    physicalWidthM: number;
    trackingAssetId?: string | null;
    mindAssetId?: string | null;
    web: {
      imageTargetName: string;
      imageTargetJson: string;
      printImage: string;
    };
  };
  nodes: MuralNode[];
  assets: Record<string, ExperienceAssetRef>;
  gallery: GalleryExtension;
  engine: {
    web: {
      preloadChunks: 'slam';
      xrScript: string;
      xrextrasScript: string;
      landingPageScript: string;
    };
  };
}
