import type { GalleryExperience, MuralNode, MuralVec3 } from './types';

export function findNode(
  experience: GalleryExperience,
  id: string
): MuralNode | undefined {
  return experience.nodes.find((n) => n.id === id);
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
  if (e.kind !== 'mural' || !e.id || !e.gallery || !e.marker?.web) {
    throw new Error('experience: invalid gallery mural package');
  }
  return e;
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
