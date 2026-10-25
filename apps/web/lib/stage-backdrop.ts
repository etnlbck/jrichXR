import * as THREE from 'three';

/** Below this, the piece reads as dark and gets a light backdrop. */
const DARK_LUMINANCE = 0.3;

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Average brightness (0–1, sRGB) of a texture, sampled down to 8×8. */
function textureLuminance(texture: THREE.Texture): number | null {
  const image = texture.image as CanvasImageSource | undefined;
  if (!image) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, 8, 8);
    const data = ctx.getImageData(0, 0, 8, 8).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += luminance(data[i], data[i + 1], data[i + 2]) / 255;
    }
    return sum / (data.length / 4);
  } catch {
    return null;
  }
}

/** Rough perceived brightness of a model from its base colors and maps. */
export function estimateModelLuminance(obj: THREE.Object3D): number {
  let total = 0;
  let count = 0;
  obj.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      const c = mat.color ?? new THREE.Color(1, 1, 1);
      let l = luminance(c.r, c.g, c.b);
      if (mat.map) {
        const t = textureLuminance(mat.map);
        if (t !== null) l *= t;
      }
      total += l;
      count += 1;
    }
  });
  return count > 0 ? total / count : 1;
}

function gradientTexture(inner: string, outer: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(256, 230, 20, 256, 256, 380);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Give the desktop stage enough contrast to see the piece: dark sculptures get
 * a light warm-grey backdrop, light ones a dark one, plus a back light that
 * separates the silhouette either way. Returns a cleanup function.
 */
export function applyStageBackdrop(
  scene: THREE.Scene,
  model: THREE.Object3D
): () => void {
  const dark = estimateModelLuminance(model) < DARK_LUMINANCE;
  const previous = scene.background;
  const texture = dark
    ? gradientTexture('#c9c1b6', '#6f675e')
    : gradientTexture('#2a2521', '#0d0b0a');
  scene.background = texture;

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const reach = Math.max(size.x, size.y, size.z, 0.1);
  const rim = new THREE.DirectionalLight(0xfff4e6, dark ? 1.4 : 0.8);
  rim.position.set(center.x - reach, center.y + reach * 1.5, center.z - reach * 2);
  rim.target.position.copy(center);
  scene.add(rim, rim.target);

  return () => {
    scene.background = previous;
    texture.dispose();
    scene.remove(rim, rim.target);
  };
}
