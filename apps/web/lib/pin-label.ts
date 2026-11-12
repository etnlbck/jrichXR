import * as THREE from 'three';
import { DEFAULT_PIN_COLOR } from '@jrichforms/experience';
import { pinColors } from './pin-color';

/** A pin title floating above its dot, facing the camera. */
export type PinLabel = {
  pinId: string;
  root: THREE.Group;
  sprite: THREE.Sprite;
  line: THREE.Line;
  /** Texture width / height. */
  aspect: number;
  /** Label height in the pin's local units before screen clamping. */
  naturalHeight: number;
  /** Dot radius in local units; the label clears it. */
  dotRadius: number;
  /** Form-based dimming set by the caller (e.g. other-form pins on desktop). */
  baseOpacity: number;
  occluded: boolean;
};

const MAX_CHARS = 32;
const FONT_PX = 44;
const PAD_X = 22;
const HEIGHT_PX = Math.round(FONT_PX * 1.55);
const MIN_SCREEN_PX = 14;
const MAX_SCREEN_PX = 34;
/** Screen gap between the top of the dot and the bottom of the label. */
const GAP_PX = 10;
const OCCLUDED_OPACITY = 0.35;

function truncate(title: string) {
  const t = title.trim();
  return t.length > MAX_CHARS ? `${t.slice(0, MAX_CHARS - 1)}…` : t;
}

function pillPath(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(r, h);
  ctx.arc(r, r, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.closePath();
}

const SYSTEM_LABEL_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function labelFont(fontFamily?: string) {
  return `600 ${FONT_PX}px ${fontFamily ?? SYSTEM_LABEL_FONT}`;
}

/**
 * Canvas text silently falls back if a web font isn't loaded yet, and never
 * redraws. Resolve before drawing labels in `fontFamily`.
 */
export async function loadLabelFont(fontFamily: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await document.fonts.load(labelFont(fontFamily));
  } catch {
    /* fall back to whatever the browser has */
  }
}

function drawLabel(text: string, selected: boolean, fontFamily?: string) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = labelFont(fontFamily);
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + PAD_X * 2;
  canvas.width = Math.max(width, HEIGHT_PX);
  canvas.height = HEIGHT_PX;
  ctx.font = font;
  pillPath(ctx, canvas.width, canvas.height);
  ctx.fillStyle = selected ? 'rgba(255, 244, 222, 0.95)' : 'rgba(13, 13, 15, 0.78)';
  ctx.fill();
  ctx.fillStyle = selected ? '#16120d' : '#f2ebe3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  return canvas;
}

export function makePinLabel(
  pinId: string,
  title: string,
  opts: {
    radius: number;
    selected?: boolean;
    opacity?: number;
    color?: string;
    /** Must already be loaded; see loadLabelFont. */
    fontFamily?: string;
  }
): PinLabel | null {
  const text = truncate(title);
  if (!text) return null;
  const selected = opts.selected ?? false;
  const colors = pinColors(opts.color ?? DEFAULT_PIN_COLOR);
  const canvas = drawLabel(text, selected, opts.fontFamily);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  );
  sprite.renderOrder = 1000;
  sprite.userData.pinId = pinId;
  sprite.userData.isPinLabel = true;

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const line = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({
      color: selected ? colors.selected : colors.dot,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  );
  line.renderOrder = 999;
  line.userData.isPinLabel = true;
  // Line bounds change every frame; skip culling instead of recomputing them.
  line.frustumCulled = false;

  const root = new THREE.Group();
  root.userData.isPinLabel = true;
  root.add(line, sprite);

  const naturalHeight = opts.radius * 2.4;
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(naturalHeight * aspect, naturalHeight, 1);
  sprite.position.set(0, naturalHeight * 2, 0);

  const label: PinLabel = {
    pinId,
    root,
    sprite,
    line,
    aspect,
    naturalHeight,
    dotRadius: opts.radius * (selected ? 1.4 : 1),
    baseOpacity: opts.opacity ?? 1,
    occluded: false,
  };
  applyLabelOpacity(label);
  return label;
}

export function applyLabelOpacity(label: PinLabel) {
  const o = label.baseOpacity * (label.occluded ? OCCLUDED_OPACITY : 1);
  (label.sprite.material as THREE.SpriteMaterial).opacity = o;
  (label.line.material as THREE.LineBasicMaterial).opacity = o * 0.8;
}

export function setLabelBaseOpacity(label: PinLabel, opacity: number) {
  if (label.baseOpacity === opacity) return;
  label.baseOpacity = opacity;
  applyLabelOpacity(label);
}

function isShown(obj: THREE.Object3D) {
  for (let o: THREE.Object3D | null = obj; o; o = o.parent) {
    if (!o.visible) return false;
  }
  return true;
}

const _rootWorld = new THREE.Vector3();
const _camWorld = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _up = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _point = new THREE.Vector3();

/**
 * Size labels so they stay readable on screen (clamped between a min and max
 * pixel height) and sit a fixed screen distance above their dot.
 */
export function fitPinLabels(
  labels: PinLabel[],
  camera: THREE.Camera,
  viewportHeightPx: number
) {
  if (viewportHeightPx <= 0) return;
  // projectionMatrix[5] = 1 / tan(fov / 2); XR8 sets the matrix directly.
  const p5 = camera.projectionMatrix.elements[5];
  if (!p5) return;
  camera.getWorldPosition(_camWorld);
  camera.getWorldQuaternion(_quat);
  _up.set(0, 1, 0).applyQuaternion(_quat);

  for (const label of labels) {
    if (!isShown(label.root)) continue;
    label.root.getWorldPosition(_rootWorld);
    label.root.getWorldScale(_scale);
    const s = Math.abs(_scale.y) || 1;
    const dist = _rootWorld.distanceTo(_camWorld);
    const worldPerPx = (2 * dist) / (p5 * viewportHeightPx);
    if (!Number.isFinite(worldPerPx) || worldPerPx <= 0) continue;

    const naturalPx = (label.naturalHeight * s) / worldPerPx;
    const px = Math.min(MAX_SCREEN_PX, Math.max(MIN_SCREEN_PX, naturalPx));
    const heightLocal = (px * worldPerPx) / s;
    label.sprite.scale.set(heightLocal * label.aspect, heightLocal, 1);

    const dotWorld = label.dotRadius * s;
    const gapWorld = dotWorld + GAP_PX * worldPerPx;
    const halfWorld = (px * worldPerPx) / 2;
    _point.copy(_rootWorld).addScaledVector(_up, gapWorld + halfWorld);
    label.sprite.position.copy(label.root.worldToLocal(_point));

    const pos = label.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    _point.copy(_rootWorld).addScaledVector(_up, dotWorld);
    const start = label.root.worldToLocal(_point);
    pos.setXYZ(0, start.x, start.y, start.z);
    _point.copy(_rootWorld).addScaledVector(_up, gapWorld);
    const end = label.root.worldToLocal(_point);
    pos.setXYZ(1, end.x, end.y, end.z);
    pos.needsUpdate = true;
  }
}

const _raycaster = new THREE.Raycaster();
const _dir = new THREE.Vector3();

/** Dim labels whose pin is hidden behind any of `occluders` from the camera. */
export function updateLabelOcclusion(
  labels: PinLabel[],
  camera: THREE.Camera,
  occluders: THREE.Object3D[]
) {
  camera.getWorldPosition(_camWorld);
  for (const label of labels) {
    if (!isShown(label.root)) continue;
    label.root.getWorldPosition(_rootWorld);
    _dir.subVectors(_rootWorld, _camWorld);
    const dist = _dir.length();
    let occluded = false;
    if (dist > 0 && occluders.length > 0) {
      _raycaster.set(_camWorld, _dir.normalize());
      _raycaster.near = 0;
      // Pins sit on the surface; leave a margin so their own spot doesn't count.
      _raycaster.far = dist * 0.97;
      occluded = _raycaster.intersectObjects(occluders, true).length > 0;
    }
    if (occluded !== label.occluded) {
      label.occluded = occluded;
      applyLabelOpacity(label);
    }
  }
}

/** Runs `fn` at most once per `intervalMs`. */
export function throttleMs(intervalMs: number) {
  let last = -Infinity;
  return (fn: () => void) => {
    const now = performance.now();
    if (now - last < intervalMs) return;
    last = now;
    fn();
  };
}

export function disposePinLabel(label: PinLabel) {
  label.root.parent?.remove(label.root);
  const mat = label.sprite.material as THREE.SpriteMaterial;
  mat.map?.dispose();
  mat.dispose();
  label.line.geometry.dispose();
  (label.line.material as THREE.Material).dispose();
}
