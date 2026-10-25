import * as THREE from 'three';

export const PIN_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: 'Amber', hex: '#ffc46a' },
  { label: 'White', hex: '#f2ebe3' },
  { label: 'Teal', hex: '#21d3d5' },
  { label: 'Coral', hex: '#ff7a59' },
  { label: 'Violet', hex: '#9b7bff' },
  { label: 'Graphite', hex: '#2b2b2b' },
];

/** Perceived brightness 0–1 of `#rrggbb`, matching stage-backdrop's formula. */
export function colorLuminance(hex: string): number {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

export type PinColors = {
  dot: number;
  /** Visibly different from `dot`: darker for light colors, lighter otherwise. */
  selected: number;
  /** Contrasting rim drawn around every dot. */
  outline: number;
};

export function pinColors(hex: string): PinColors {
  const base = new THREE.Color(hex);
  const lum = colorLuminance(hex);
  const selected =
    lum > 0.7
      ? base.clone().lerp(new THREE.Color(0x000000), 0.35)
      : base.clone().lerp(new THREE.Color(0xffffff), 0.5);
  return {
    dot: base.getHex(),
    selected: selected.getHex(),
    outline: lum > 0.5 ? 0x141210 : 0xf2ebe3,
  };
}

/**
 * Back-facing shell slightly larger than the dot, so only its rim shows.
 * Add it as a sibling or child of the dot, centered on it.
 */
export function makePinOutline(radius: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.25, 16, 12),
    new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })
  );
  mesh.userData.isPinOutline = true;
  mesh.userData.dotRadius = radius;
  return mesh;
}

const cameraLocal = new THREE.Vector3();

/**
 * Dots sit half inside the surface, which would hide half the rim. Shifting
 * each outline toward the camera by the dot radius keeps the whole ring in
 * front of the surface without changing where it appears on screen.
 */
export function faceOutlinesToCamera(root: THREE.Object3D, camera: THREE.Camera) {
  camera.getWorldPosition(cameraLocal);
  const world = cameraLocal.clone();
  root.traverse((obj) => {
    if (!obj.userData.isPinOutline || !obj.parent) return;
    cameraLocal.copy(world);
    obj.parent.worldToLocal(cameraLocal);
    const len = cameraLocal.length();
    if (len === 0) return;
    obj.position.copy(cameraLocal).multiplyScalar(obj.userData.dotRadius / len);
  });
}
