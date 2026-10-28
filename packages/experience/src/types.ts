/**
 * Local mirror of Aura eng mural shapes + jrichforms gallery extension.
 * Sync with @aura-lenses/eng when publishing to Lenses.
 */

export type MuralNodeType = 'image' | 'video' | 'model' | 'audio' | 'gltf';
export type MuralNodeTrigger = 'onDetect' | 'tap' | 'loop' | 'proximity';
export type MuralPlacement = 'wall' | 'merch';
/** Package shape shared by sculpture murals and generic marker experiences. */
export type ExperienceKind = 'mural' | 'experience';

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

export type PinForm = 'finished' | 'raw' | 'both';
/** Dot = spatial note; cta = HTML overlay button after Arrive. */
export type PinStyle = 'dot' | 'cta';
/**
 * What a cta pin does when tapped. Missing means link: open `href` in a new tab.
 * video: play the `href` video in a popover. form: open a contact form popover
 * (`href` holds the receiving address as `mailto:name@example.com`).
 */
export type PinAction = 'link' | 'video' | 'form';

export type ShareTargetId = 'whatsapp' | 'x' | 'email';

/** Point on the sculpture in GLB-root local space (before marker placement). */
export interface SpatialPin {
  id: string;
  title: string;
  body: string;
  position: MuralVec3;
  audioAssetId?: string;
  /** Which morph form shows the pin. Missing means both. */
  form?: PinForm;
  /** Optional outbound link (CTA). */
  href?: string;
  /** Label for the CTA button when href is set. */
  ctaLabel?: string;
  /** Optional image shown in the pin sheet (https Blob URL). */
  imageUrl?: string;
  /** Presentation. Missing means dot. */
  style?: PinStyle;
  /** Tap behavior for cta pins. Missing means link. */
  action?: PinAction;
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
  /** Arrive densify overrides; missing fields use product defaults. */
  reveal?: {
    densifyMs?: number;
    scatterFactor?: number;
    /** One-shot Arrive sting (https Blob or site URL). */
    stingUrl?: string;
    /** Short vibration on densify complete when supported. Default off. */
    haptics?: boolean;
  };
  /**
   * Extra share intents under Share. Missing means whatsapp + x + email.
   * Empty array = system share / copy only.
   */
  shareTargets?: ShareTargetId[];
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
  pins?: SpatialPin[];
  /** `#rrggbb` for pin dots and leader lines. Missing means the brand accent, then amber. */
  pinColor?: string;
  /** Per-sculpture values that replace the owner's brand profile. */
  brandOverrides?: ArtistBrand;
}

export type BrandFontId =
  | 'system'
  | 'inter'
  | 'space-grotesk'
  | 'archivo'
  | 'dm-serif-display'
  | 'playfair-display'
  | 'cormorant-garamond';

/** Artist brand profile. Every field is optional; missing fields use platform defaults. */
export interface ArtistBrand {
  displayName?: string;
  logoUrl?: string;
  /** `#rrggbb` gradient start. */
  accentFrom?: string;
  /** `#rrggbb` gradient end. */
  accentTo?: string;
  font?: BrandFontId;
  beginText?: string;
  beginLabel?: string;
  loadingText?: string;
  /** Scan reticle hint while aiming at the marker. */
  scanText?: string;
  /** Brief copy when the marker is found (Arrive). */
  scanFoundText?: string;
  shareImageUrl?: string;
}

export interface GalleryExperience {
  id: string;
  version: string;
  kind: ExperienceKind;
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
  /** Owner profile merged with overrides, frozen when the sculpture is published. */
  brand?: ArtistBrand;
  engine: {
    web: {
      preloadChunks: 'slam';
      xrScript: string;
    };
  };
}
