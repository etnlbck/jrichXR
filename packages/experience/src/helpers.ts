import type {
  ExperienceKind,
  GalleryExperience,
  MuralNode,
  MuralNodeTrigger,
  MuralVec3,
  PinForm,
  SpatialPin,
} from './types';
import { sanitizeBrand } from './brand';

const EXPERIENCE_KINDS = new Set<ExperienceKind>(['mural', 'experience']);

export function isExperienceKind(value: unknown): value is ExperienceKind {
  return typeof value === 'string' && EXPERIENCE_KINDS.has(value as ExperienceKind);
}

/**
 * Sculpture morph (finished↔raw) is mural-only. Generic `experience` packages
 * still share the marker/node schema but skip morph chrome.
 */
export function supportsMorph(experience: GalleryExperience): boolean {
  return experience.kind === 'mural';
}

/**
 * Image planes authored as mural nodes (excludes the morph-linked `overlay`).
 * WebAR honors `onDetect` and `tap`; other triggers fall back to onDetect.
 */
export function mediaImageNodes(experience: GalleryExperience): MuralNode[] {
  return experience.nodes.filter(
    (n) => n.type === 'image' && n.id !== 'overlay'
  );
}

/** Video planes (same placement rules as images). */
export function mediaVideoNodes(experience: GalleryExperience): MuralNode[] {
  return experience.nodes.filter((n) => n.type === 'video');
}

/** Package audio nodes (not pin audio / narration). */
export function mediaAudioNodes(experience: GalleryExperience): MuralNode[] {
  return experience.nodes.filter((n) => n.type === 'audio');
}

/**
 * Extra model/gltf props — excludes the morph pair (`finished` / `raw`).
 */
export function extraModelNodes(experience: GalleryExperience): MuralNode[] {
  return experience.nodes.filter(
    (n) =>
      (n.type === 'model' || n.type === 'gltf') &&
      n.id !== 'finished' &&
      n.id !== 'raw'
  );
}

/** Normalize trigger for WebAR; unknown → onDetect. */
export function runtimeTrigger(
  node: Pick<MuralNode, 'trigger'>
): MuralNodeTrigger {
  const t = node.trigger ?? 'onDetect';
  if (t === 'tap' || t === 'loop' || t === 'proximity' || t === 'onDetect') {
    return t;
  }
  return 'onDetect';
}

export function galleryPins(experience: GalleryExperience): SpatialPin[] {
  return experience.gallery.pins ?? [];
}

export function pinForm(pin: Pick<SpatialPin, 'form'>): PinForm {
  return pin.form === 'finished' || pin.form === 'raw' ? pin.form : 'both';
}

/** Whether a pin is visible when the given form is showing. */
export function pinShowsOn(
  pin: Pick<SpatialPin, 'form'>,
  showing: 'finished' | 'raw'
): boolean {
  const form = pinForm(pin);
  return form === 'both' || form === showing;
}

export function findNode(
  experience: GalleryExperience,
  id: string
): MuralNode | undefined {
  return experience.nodes.find((n) => n.id === id);
}

/** Nodes with an explicit or default trigger; eng treats a missing trigger as onDetect. */
export function nodesForTrigger(
  experience: GalleryExperience,
  trigger: MuralNodeTrigger
): MuralNode[] {
  return experience.nodes.filter((n) => (n.trigger ?? 'onDetect') === trigger);
}

/** Model revealed when the image target is first found. */
export function detectModelNodeId(experience: GalleryExperience): string {
  const node = nodesForTrigger(experience, 'onDetect').find(
    (n) => n.type === 'model' || n.type === 'gltf'
  );
  return node?.id ?? 'finished';
}

export function assetWebPath(
  experience: GalleryExperience,
  assetId: string
): string | undefined {
  return experience.assets[assetId]?.webPath;
}

/**
 * Eng model scale is a fraction of marker physical width.
 * 8th Wall image-target local units are typically ~marker width = 1.
 * Convert eng meters → XR8 local: divide by physicalWidthM.
 */
export function engMetersToXr8Units(
  meters: number,
  physicalWidthM: number
): number {
  const w = physicalWidthM > 0 ? physicalWidthM : 1;
  return meters / w;
}

export function engVecToXr8(
  v: MuralVec3,
  physicalWidthM: number
): MuralVec3 {
  return {
    x: engMetersToXr8Units(v.x, physicalWidthM),
    y: engMetersToXr8Units(v.y, physicalWidthM),
    z: engMetersToXr8Units(v.z, physicalWidthM),
  };
}

export function parseGalleryExperience(raw: unknown): GalleryExperience {
  if (!raw || typeof raw !== 'object') {
    throw new Error('experience: expected object');
  }
  const e = raw as GalleryExperience;
  if (!isExperienceKind(e.kind) || !e.id || !e.gallery || !e.marker?.web) {
    throw new Error('experience: invalid gallery package');
  }
  const { pinColor: rawPinColor, brandOverrides: rawOverrides, ...gallery } = e.gallery;
  const { brand: rawBrand, ...rest } = e;
  const overrides = sanitizeBrand(rawOverrides);
  const brand = sanitizeBrand(rawBrand);
  return {
    ...rest,
    gallery: {
      ...gallery,
      pins: Array.isArray(e.gallery.pins) ? e.gallery.pins : [],
      ...(isHexColor(rawPinColor) ? { pinColor: rawPinColor.toLowerCase() } : {}),
      ...(Object.keys(overrides).length > 0 ? { brandOverrides: overrides } : {}),
    },
    ...(Object.keys(brand).length > 0 ? { brand } : {}),
  };
}

export const DEFAULT_PIN_COLOR = '#ffc46a';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

/** Sculpture pin color, then the published brand accent, then amber. */
export function pinColor(experience: GalleryExperience): string {
  const c = experience.gallery.pinColor;
  if (isHexColor(c)) return c.toLowerCase();
  const accent = experience.brand?.accentFrom;
  return isHexColor(accent) ? accent.toLowerCase() : DEFAULT_PIN_COLOR;
}

export interface NodeXr8Placement {
  position: MuralVec3;
  /** Eng rotation (degrees in our package). */
  rotationDeg: MuralVec3;
  /**
   * Model scale as fraction of marker width (eng). In XR8 local space
   * (marker width ≈ 1), that fraction is used directly as uniform scale.
   */
  scale: number;
}

export function getNodeXr8Placement(
  experience: GalleryExperience,
  nodeId: string
): NodeXr8Placement {
  const node = findNode(experience, nodeId);
  const physicalWidthM = experience.marker.physicalWidthM;
  const pos = node?.position ?? { x: 0, y: 0.15, z: 0 };
  const rot = node?.rotation ?? { x: 0, y: 0, z: 0 };
  const scale =
    typeof node?.scale === 'number'
      ? node.scale
      : typeof node?.scale === 'object'
        ? node.scale.x
        : 1;

  return {
    position: engVecToXr8(pos, physicalWidthM),
    rotationDeg: rot,
    scale,
  };
}
