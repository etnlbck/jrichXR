import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { pinShowsOn, type MuralNodeTrigger, type PinForm } from '@jrichforms/experience';
import { resolvedBrandFontFamily } from './brand-font-options';
import type { AppConfig } from './config';
import { mark } from './metrics';
import { faceOutlinesToCamera, makePinOutline, pinColors } from './pin-color';
import { applyStageBackdrop } from './stage-backdrop';
import {
  disposePinLabel,
  fitPinLabels,
  loadLabelFont,
  makePinLabel,
  throttleMs,
  updateLabelOcclusion,
  type PinLabel,
} from './pin-label';
import {
  REVEAL,
  prefersReducedMotion,
  revealPointBudget,
  type RevealState,
} from './reveal';
import type { ImageTargetDetail, UiState } from './types';

export type ScenePin = {
  id: string;
  title: string;
  position: { x: number; y: number; z: number };
  form: PinForm;
  style?: 'dot' | 'cta';
};

export type SceneCallbacks = {
  onState: (state: UiState) => void;
  onEnterRaw: () => void;
  onEnterFinished: () => void;
  onLoadError: (message: string) => void;
  onModelsReady: () => void;
  /** First-lock densify started (reticle can succeed / chrome waits). */
  onRevealStart?: () => void;
  /** Densify finished — safe to show pins chrome and accept taps. */
  onRevealComplete?: () => void;
};

/**
 * Three.js content + raw↔finished morph, driven by the 8th Wall camera pipeline.
 */
export type SceneOptions = {
  /** Visitor Arrive densify. Off for studio pin placement. Default true. */
  activationReveal?: boolean;
};

export function createScene(
  config: AppConfig,
  callbacks: SceneCallbacks,
  options: SceneOptions = {}
) {
  const activationReveal = options.activationReveal !== false;
  let three: ReturnType<NonNullable<Window['XR8']>['Threejs']['xrScene']> | null =
    null;
  let anchor: THREE.Group | null = null;
  let piece: THREE.Group | null = null;
  let finished: THREE.Object3D | null = null;
  let raw: THREE.Object3D | null = null;
  let overlay: THREE.Mesh | null = null;
  let placeholder: THREE.Mesh | null = null;
  /** Extra image/video planes from package nodes. */
  const mediaMeshes: {
    id: string;
    kind: 'image' | 'video';
    trigger: MuralNodeTrigger;
    mesh: THREE.Mesh;
    revealed: boolean;
    video?: HTMLVideoElement;
  }[] = [];
  const audioNodes: {
    id: string;
    trigger: MuralNodeTrigger;
    audio: HTMLAudioElement;
    position: THREE.Vector3;
    started: boolean;
  }[] = [];
  const extraModelRoots: {
    id: string;
    trigger: MuralNodeTrigger;
    root: THREE.Object3D;
    revealed: boolean;
  }[] = [];
  let audioUnlocked = false;
  const pinHits: THREE.Object3D[] = [];
  const pinGroups: { id: string; form: PinForm; group: THREE.Group }[] = [];
  let pins: ScenePin[] = config.pins;
  let pinRoot: THREE.Group | null = null;
  let pinRadius = 0.012;
  const labels: PinLabel[] = [];
  const occlusionTick = throttleMs(200);
  /** Canvas the scene renders into; its height sizes the pin labels. */
  let viewportEl: HTMLCanvasElement | null = null;
  let selectedPinId: string | null = null;
  /** While placing a pin, ignore tracking updates so the model holds still. */
  let poseHeld = false;
  let stageCamera: THREE.PerspectiveCamera | null = null;
  let stageScene: THREE.Scene | null = null;
  let clearStageBackdrop: (() => void) | null = null;
  let modelsReady = false;
  let visible = false;
  let morphT = 0;
  let morphTarget = 0;
  let hasLocked = false;
  /** Set after the first tap so a re-lock reports RAW/FINISHED instead of ANCHORED. */
  let hasMorphed = false;
  /** Overlay opacity follows morph, timed by gallery.morph.overlayFadeMs. */
  let overlayT = 0;
  let clock: THREE.Clock | null = null;
  /** First-lock splat-feel densify. */
  let revealState: RevealState = 'idle';
  let revealT = 0;
  let revealDurationSec = REVEAL.densifyMs / 1000;
  let revealCloud: THREE.Points | null = null;
  let revealTargets: Float32Array | null = null;
  let revealStarts: Float32Array | null = null;
  let revealReduced = false;
  /** Mesh used to sample densify points; cloud built lazily at beginReveal. */
  let revealSource: THREE.Object3D | null = null;
  let revealBaseSize = 0.012;
  let revealDiscTex: THREE.Texture | null = null;
  const revealColorFrom = new THREE.Color();
  const revealColorTo = new THREE.Color();
  const revealColorMix = new THREE.Color();
  let stableLockTimer: ReturnType<typeof setTimeout> | null = null;
  let trackingGraceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingReveal = false;
  /** Soft fade after Arrive when tracking drops (not mid-densify). */
  let postRevealFading = false;
  let postRevealFadeT = 0;
  type FadeMat = THREE.Material & {
    opacity: number;
    transparent: boolean;
    needsUpdate: boolean;
    userData: { jrfBaseOpacity?: number };
  };

  function softDiscTexture(): THREE.Texture {
    if (revealDiscTex) return revealDiscTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    if (!ctx) {
      revealDiscTex = new THREE.Texture();
      return revealDiscTex;
    }
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    revealDiscTex = new THREE.CanvasTexture(c);
    revealDiscTex.needsUpdate = true;
    return revealDiscTex;
  }
  /** Brand font for pin labels, set once it has loaded. */
  let labelFontFamily: string | undefined;
  if (config.brand.font !== 'system' && typeof document !== 'undefined') {
    const family = resolvedBrandFontFamily(config.brand.font);
    void loadLabelFont(family).then(() => {
      labelFontFamily = family;
      rebuildPins();
    });
  }

  function setOpacity(obj: THREE.Object3D, o: number) {
    obj.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const m of mats) {
          const mat = m as THREE.Material & { opacity?: number; transparent?: boolean };
          mat.transparent = true;
          mat.opacity = o;
          mat.depthWrite = o > 0.95;
          mat.needsUpdate = true;
        }
        mesh.visible = o > 0.001;
      }
    });
  }

  function applyPlacement(obj: THREE.Object3D) {
    const p = config.placement;
    obj.position.set(p.position.x, p.position.y, p.position.z);
    obj.rotation.set(
      THREE.MathUtils.degToRad(p.rotationDeg.x),
      THREE.MathUtils.degToRad(p.rotationDeg.y),
      THREE.MathUtils.degToRad(p.rotationDeg.z)
    );
    obj.scale.setScalar(p.scale);
  }

  function showingForm(): 'finished' | 'raw' {
    return morphTarget > 0.5 ? 'raw' : 'finished';
  }

  function updatePinVisibility() {
    if (pinRoot) {
      pinRoot.visible = revealState === 'done';
    }
    if (revealState !== 'done') return;
    const showing = morphT > 0.5 ? 'raw' : 'finished';
    for (const g of pinGroups) {
      g.group.visible = pinShowsOn(g, showing);
    }
  }

  function clearStableLockTimer() {
    if (stableLockTimer !== null) {
      clearTimeout(stableLockTimer);
      stableLockTimer = null;
    }
  }

  function clearTrackingGraceTimer() {
    if (trackingGraceTimer !== null) {
      clearTimeout(trackingGraceTimer);
      trackingGraceTimer = null;
    }
  }

  function eachFadeMaterial(root: THREE.Object3D | null, fn: (mat: FadeMat) => void) {
    if (!root) return;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const m of mats) {
        if (!m || !('opacity' in m)) continue;
        fn(m as FadeMat);
      }
    });
  }

  function applyAnchorFade(multiplier: number) {
    eachFadeMaterial(anchor, (mat) => {
      if (mat.userData.jrfBaseOpacity === undefined) {
        mat.userData.jrfBaseOpacity = mat.opacity;
      }
      mat.transparent = true;
      mat.opacity = mat.userData.jrfBaseOpacity * multiplier;
      mat.needsUpdate = true;
    });
  }

  function restoreAnchorFade() {
    eachFadeMaterial(anchor, (mat) => {
      if (mat.userData.jrfBaseOpacity === undefined) return;
      mat.opacity = mat.userData.jrfBaseOpacity;
      mat.needsUpdate = true;
    });
  }

  function cancelPostRevealFade() {
    if (!postRevealFading) return;
    postRevealFading = false;
    postRevealFadeT = 0;
    restoreAnchorFade();
    if (anchor) anchor.visible = true;
    visible = true;
  }

  function beginPostRevealFade() {
    if (postRevealFading) return;
    postRevealFading = true;
    postRevealFadeT = 0;
    mark('tracking_lost_post_reveal');
  }

  function updatePostRevealFade(dt: number) {
    if (!postRevealFading) return;
    const dur = REVEAL.postRevealFadeMs / 1000;
    postRevealFadeT += dt / Math.max(dur, 0.05);
    const t = Math.min(1, postRevealFadeT);
    applyAnchorFade(1 - t);
    if (t < 1) return;
    postRevealFading = false;
    postRevealFadeT = 0;
    restoreAnchorFade();
    if (anchor) anchor.visible = false;
    visible = false;
    callbacks.onState('SCANNING');
  }

  function disposeRevealCloud() {
    if (!revealCloud) return;
    revealCloud.parent?.remove(revealCloud);
    revealCloud.geometry.dispose();
    (revealCloud.material as THREE.PointsMaterial).dispose();
    revealCloud = null;
  }

  /** Sample finished mesh into a one-shot point cloud parented under `piece`. */
  function buildRevealCloud(source: THREE.Object3D) {
    disposeRevealCloud();
    if (!piece) return;

    const worldPts: THREE.Vector3[] = [];
    const v = new THREE.Vector3();
    source.updateMatrixWorld(true);
    source.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const pos = mesh.geometry.attributes.position;
      if (!pos) return;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        mesh.localToWorld(v);
        worldPts.push(v.clone());
      }
    });

    if (worldPts.length === 0) {
      const box = new THREE.Box3().setFromObject(source);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      for (let i = 0; i < 64; i++) {
        worldPts.push(
          new THREE.Vector3(
            center.x + (Math.random() - 0.5) * size.x,
            center.y + (Math.random() - 0.5) * size.y,
            center.z + (Math.random() - 0.5) * size.z
          )
        );
      }
    }

    const budget = revealPointBudget();
    console.info(`[jrf] reveal point budget: ${budget}`);
    const step = Math.max(1, Math.ceil(worldPts.length / budget));
    const sampled: THREE.Vector3[] = [];
    for (let i = 0; i < worldPts.length; i += step) {
      const local = piece.worldToLocal(worldPts[i].clone());
      sampled.push(local);
    }

    const box = new THREE.Box3().setFromObject(source);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const scatterFactor = config.reveal?.scatterFactor ?? REVEAL.scatterFactor;
    const scatter = Math.max(sphere.radius * scatterFactor, 0.04);
    const center = piece.worldToLocal(sphere.center.clone());

    const n = sampled.length;
    revealTargets = new Float32Array(n * 3);
    revealStarts = new Float32Array(n * 3);
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = sampled[i];
      revealTargets[i * 3] = t.x;
      revealTargets[i * 3 + 1] = t.y;
      revealTargets[i * 3 + 2] = t.z;
      // Bias scatter outward from model center (surface bloom, not cube noise).
      let dx = t.x - center.x;
      let dy = t.y - center.y;
      let dz = t.z - center.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      dx /= len;
      dy /= len;
      dz /= len;
      const dist = scatter * (0.35 + Math.random() * 0.9);
      const jitter = scatter * 0.2;
      revealStarts[i * 3] = t.x + dx * dist + (Math.random() - 0.5) * jitter;
      revealStarts[i * 3 + 1] =
        t.y + dy * dist + (Math.random() - 0.5) * jitter;
      revealStarts[i * 3 + 2] =
        t.z + dz * dist + (Math.random() - 0.5) * jitter;
      positions[i * 3] = revealStarts[i * 3];
      positions[i * 3 + 1] = revealStarts[i * 3 + 1];
      positions[i * 3 + 2] = revealStarts[i * 3 + 2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    revealColorFrom.set(config.brand.accentTo || '#24d8da');
    revealColorTo.set(config.brand.accentFrom || '#1732a4');
    revealBaseSize = Math.max(sphere.radius * 0.045, 0.01);
    const mat = new THREE.PointsMaterial({
      color: revealColorFrom.clone(),
      map: softDiscTexture(),
      size: revealBaseSize * 1.6,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    revealCloud = new THREE.Points(geo, mat);
    revealCloud.visible = false;
    piece.add(revealCloud);
  }

  function resetCloudToScattered() {
    if (!revealCloud || !revealStarts) return;
    const attr = revealCloud.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    arr.set(revealStarts);
    attr.needsUpdate = true;
    const mat = revealCloud.material as THREE.PointsMaterial;
    mat.opacity = 0.95;
    mat.size = revealBaseSize * 1.6;
    mat.color.copy(revealColorFrom);
  }

  function applyMorphOpacities() {
    if (finished && raw) {
      setOpacity(finished, 1 - morphT);
      setOpacity(raw, morphT);
    } else if (finished) {
      setOpacity(finished, 1);
    } else if (placeholder) {
      setOpacity(placeholder, 1);
    }
    if (overlay) {
      const mat = overlay.material as THREE.MeshBasicMaterial;
      mat.opacity = overlayT;
    }
  }

  function hidePieceForReveal() {
    if (finished) setOpacity(finished, 0);
    if (raw) setOpacity(raw, 0);
    if (placeholder) setOpacity(placeholder, 0);
    if (overlay) {
      (overlay.material as THREE.MeshBasicMaterial).opacity = 0;
    }
    updatePinVisibility();
  }

  function completeReveal() {
    clearStableLockTimer();
    clearTrackingGraceTimer();
    revealState = 'done';
    revealT = 1;
    disposeRevealCloud();
    revealTargets = null;
    revealStarts = null;
    applyMorphOpacities();
    updatePinVisibility();
    mark('reveal_complete');
    callbacks.onRevealComplete?.();
  }

  /** Abort mid-reveal so the next lock can retry densify. */
  function cancelReveal() {
    clearStableLockTimer();
    clearTrackingGraceTimer();
    if (revealState === 'done') return;
    const wasActive =
      revealState === 'playing' || revealState === 'waiting';
    revealState = 'idle';
    revealT = 0;
    if (revealCloud) {
      revealCloud.visible = false;
      resetCloudToScattered();
    }
    hidePieceForReveal();
    if (anchor) anchor.visible = false;
    visible = false;
    if (wasActive) mark('reveal_cancel');
  }

  function beginReveal() {
    clearStableLockTimer();
    clearTrackingGraceTimer();
    if (revealState === 'done' || revealState === 'playing') return;
    if (!modelsReady) {
      pendingReveal = true;
      return;
    }

    revealReduced = prefersReducedMotion();
    if (!revealReduced && revealSource && !revealCloud) {
      buildRevealCloud(revealSource);
    }
    const useCloud = !revealReduced && revealCloud !== null;
    const densifyMs = config.reveal?.densifyMs ?? REVEAL.densifyMs;
    revealDurationSec =
      (useCloud
        ? stageScene
          ? Math.min(densifyMs, 700)
          : densifyMs
        : REVEAL.shortFadeMs) / 1000;
    revealT = 0;
    revealState = 'playing';
    pendingReveal = false;

    hidePieceForReveal();
    if (useCloud && revealCloud) {
      resetCloudToScattered();
      revealCloud.visible = true;
    }
    if (anchor) anchor.visible = true;
    visible = true;

    mark('reveal_start');
    callbacks.onRevealStart?.();
    if (!hasMorphed) callbacks.onState('ANCHORED');
    else callbacks.onState(morphTarget > 0.5 ? 'RAW' : 'FINISHED');
  }

  function scheduleReveal() {
    if (!activationReveal) {
      if (revealState !== 'done') {
        revealState = 'done';
        applyMorphOpacities();
        updatePinVisibility();
        if (anchor) anchor.visible = true;
        visible = true;
        callbacks.onRevealComplete?.();
      }
      return;
    }
    if (revealState === 'done' || revealState === 'playing') return;
    if (!modelsReady) {
      pendingReveal = true;
      return;
    }
    clearStableLockTimer();
    revealState = 'waiting';
    const delay = stageScene ? 0 : REVEAL.stableLockMs;
    stableLockTimer = setTimeout(() => {
      stableLockTimer = null;
      beginReveal();
    }, delay);
  }

  function updateReveal(dt: number) {
    if (revealState !== 'playing') return;
    revealT = Math.min(1, revealT + dt / Math.max(revealDurationSec, 0.001));

    const ease = revealT * revealT * (3 - 2 * revealT);

    if (revealCloud && revealTargets && revealStarts && !revealReduced) {
      const attr = revealCloud.geometry.attributes
        .position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const n = revealTargets.length / 3;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        arr[i3] =
          revealStarts[i3] + (revealTargets[i3] - revealStarts[i3]) * ease;
        arr[i3 + 1] =
          revealStarts[i3 + 1] +
          (revealTargets[i3 + 1] - revealStarts[i3 + 1]) * ease;
        arr[i3 + 2] =
          revealStarts[i3 + 2] +
          (revealTargets[i3 + 2] - revealStarts[i3 + 2]) * ease;
      }
      attr.needsUpdate = true;
      const mat = revealCloud.material as THREE.PointsMaterial;
      mat.size = revealBaseSize * (1.6 - 0.85 * ease);
      revealColorMix.copy(revealColorFrom).lerp(revealColorTo, ease);
      mat.color.copy(revealColorMix);
      mat.opacity = 0.95 * (1 - Math.max(0, (ease - 0.5) / 0.5));
    }

    const solid = Math.max(0, (ease - 0.4) / 0.6);
    if (finished && raw) {
      setOpacity(finished, solid * (1 - morphT));
      setOpacity(raw, solid * morphT);
    } else if (finished) {
      setOpacity(finished, solid);
    } else if (placeholder) {
      setOpacity(placeholder, solid);
    }

    if (revealT >= 1) completeReveal();
  }

  function rebuildPins() {
    if (!pinRoot) return;
    for (const label of labels) disposePinLabel(label);
    labels.length = 0;
    pinRoot.clear();
    pinHits.length = 0;
    pinGroups.length = 0;
    const colors = pinColors(config.pinColor);
    for (const pin of pins) {
      if (pin.style === 'cta') continue;
      const group = new THREE.Group();
      group.position.set(pin.position.x, pin.position.y, pin.position.z);
      const selected = pin.id === selectedPinId;
      const dotRadius = pinRadius * (selected ? 1.4 : 1);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(dotRadius, 16, 12),
        new THREE.MeshBasicMaterial({ color: selected ? colors.selected : colors.dot })
      );
      group.add(makePinOutline(dotRadius, colors.outline));
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(pinRadius * 3, 8, 8),
        new THREE.MeshBasicMaterial({
          visible: false,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      dot.userData.pinId = pin.id;
      hit.userData.pinId = pin.id;
      group.add(dot);
      group.add(hit);
      const label = makePinLabel(pin.id, pin.title, {
        radius: pinRadius,
        selected,
        color: config.pinColor,
        fontFamily: labelFontFamily,
      });
      if (label) {
        group.add(label.root);
        labels.push(label);
      }
      pinRoot.add(group);
      pinHits.push(dot, hit);
      pinGroups.push({ id: pin.id, form: pin.form, group });
    }
    updatePinVisibility();
  }

  function addPins(parent: THREE.Object3D, radius: number) {
    pinRadius = radius;
    pinRoot = new THREE.Group();
    parent.add(pinRoot);
    rebuildPins();
  }

  /** Cool/matte look so interim raw (duplicate of finished) still reads as a morph. */
  function applyInterimRawLook(obj: THREE.Object3D) {
    obj.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (let i = 0; i < mats.length; i++) {
        const src = mats[i] as THREE.MeshStandardMaterial;
        const cloned = src.clone();
        if ('color' in cloned && cloned.color) {
          cloned.color.offsetHSL(0.55, -0.25, -0.08);
        }
        if ('metalness' in cloned) cloned.metalness = 0.05;
        if ('roughness' in cloned) cloned.roughness = 0.92;
        mats[i] = cloned;
      }
      mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
    });
  }

  async function assetExists(url: string) {
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (head.ok) return true;
      // Some static hosts mishandle HEAD — fall back to a ranged GET.
      const get = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      return get.ok || get.status === 206;
    } catch {
      return false;
    }
  }

  function makePlaceholderCube() {
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6a1a,
      metalness: 0.2,
      roughness: 0.45,
    });
    placeholder = new THREE.Mesh(geo, mat);
    applyPlacement(placeholder);
    anchor!.add(placeholder);
    if (activationReveal) {
      revealSource = placeholder;
      hidePieceForReveal();
    } else {
      revealState = 'done';
      applyMorphOpacities();
      updatePinVisibility();
    }
    modelsReady = true;
    mark('models_ready_cube');
    frameStageCamera();
    callbacks.onModelsReady();
    if (activationReveal && (stageScene || pendingReveal)) scheduleReveal();
  }

  function frameStageCamera() {
    const subject = piece ?? placeholder;
    if (!stageCamera || !subject) return;
    const box = new THREE.Box3().setFromObject(subject);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.05);
    const dist =
      (maxDim / (2 * Math.tan((stageCamera.fov * Math.PI) / 360))) * 1.6;
    stageCamera.position.set(center.x, center.y, center.z + dist);
    stageCamera.near = Math.max(dist / 100, 0.001);
    stageCamera.far = dist * 20;
    stageCamera.lookAt(center);
    stageCamera.updateProjectionMatrix();
  }

  async function loadModels() {
    if (!anchor) return;

    const hasFinished = await assetExists(config.assets.finishedModel);
    const hasRaw = await assetExists(config.assets.rawModel);

    if (config.usePlaceholderCube || !hasFinished) {
      makePlaceholderCube();
      if (!hasFinished) {
        console.warn(
          '[jrf] finished.glb missing — using placeholder cube (Milestone 0)'
        );
      }
      return;
    }

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(config.assets.dracoDecoderPath);
    loader.setDRACOLoader(draco);

    const loadGltf = (url: string) =>
      new Promise<THREE.Group>((resolve, reject) => {
        loader.load(
          url,
          (g) => resolve(g.scene),
          undefined,
          (err) => reject(err)
        );
      });

    try {
      piece = new THREE.Group();
      applyPlacement(piece);
      anchor.add(piece);

      finished = await loadGltf(config.assets.finishedModel);
      piece.add(finished);
      mark('finished_model_loaded');
      // The camera feed is the backdrop in AR; only the desktop stage needs one.
      if (stageScene) clearStageBackdrop = applyStageBackdrop(stageScene, finished);

      if (hasRaw) {
        raw = await loadGltf(config.assets.rawModel);
        if (config.assets.interimRaw) {
          applyInterimRawLook(raw);
          console.info(
            '[jrf] raw.glb is interim (duplicate mesh + cool tint). Replace with aligned raw stone.'
          );
        }
        piece.add(raw);
        mark('raw_model_loaded');
      }

      const box = new THREE.Box3().setFromObject(finished);
      const size = box.getSize(new THREE.Vector3());
      const pinRadius = Math.max(
        0.008,
        Math.max(size.x, size.y, size.z) * 0.018
      );
      addPins(piece, pinRadius);
      if (activationReveal) {
        revealSource = finished;
        hidePieceForReveal();
      } else {
        revealState = 'done';
        applyMorphOpacities();
        updatePinVisibility();
      }

      const hasOverlay = await assetExists(config.assets.overlay);
      if (hasOverlay) {
        const tex = await new Promise<THREE.Texture>((resolve, reject) => {
          new THREE.TextureLoader().load(
            config.assets.overlay,
            resolve,
            undefined,
            reject
          );
        });
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        // Marker-local width ≈ 1 in XR8; overlay covers most of the placard face.
        overlay = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), mat);
        const op = config.overlayPlacement;
        overlay.position.set(op.x, op.y, op.z);
        anchor.add(overlay);
      }

      await loadMediaNodes(loadGltf);

      modelsReady = true;
      mark('models_ready');
      frameStageCamera();
      callbacks.onModelsReady();
      if (activationReveal && (stageScene || pendingReveal)) scheduleReveal();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load 3D models';
      callbacks.onLoadError(message);
      makePlaceholderCube();
    } finally {
      draco.dispose();
    }
  }

  function placeOnAnchor(
    obj: THREE.Object3D,
    placement: AppConfig['mediaNodes'][number]['placement']
  ) {
    const p = placement.position;
    obj.position.set(p.x, p.y, p.z);
    const r = placement.rotationDeg;
    obj.rotation.set(
      THREE.MathUtils.degToRad(r.x),
      THREE.MathUtils.degToRad(r.y),
      THREE.MathUtils.degToRad(r.z)
    );
  }

  function startsHidden(trigger: MuralNodeTrigger): boolean {
    return trigger === 'tap' || trigger === 'proximity';
  }

  async function loadMediaNodes(
    loadGltf: (url: string) => Promise<THREE.Group>
  ) {
    if (!anchor) return;
    for (const entry of mediaMeshes) {
      entry.video?.pause();
      entry.mesh.parent?.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      const mat = entry.mesh.material;
      if (mat instanceof THREE.Material) {
        const map = (mat as THREE.MeshBasicMaterial).map;
        map?.dispose();
        mat.dispose();
      }
    }
    mediaMeshes.length = 0;
    for (const a of audioNodes) {
      a.audio.pause();
    }
    audioNodes.length = 0;
    for (const m of extraModelRoots) {
      m.root.parent?.remove(m.root);
    }
    extraModelRoots.length = 0;

    for (const node of config.mediaNodes) {
      try {
        const tex = await new Promise<THREE.Texture>((resolve, reject) => {
          new THREE.TextureLoader().load(node.url, resolve, undefined, reject);
        });
        const img = tex.image as { width?: number; height?: number } | undefined;
        const aspect =
          img?.width && img?.height && img.width > 0
            ? img.height / img.width
            : 1;
        const width = Math.max(0.05, node.placement.scale);
        const height = width * aspect;
        const hidden = startsHidden(node.trigger);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: hidden ? 0 : 1,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(width, height),
          mat
        );
        placeOnAnchor(mesh, node.placement);
        mesh.userData.mediaNodeId = node.id;
        anchor.add(mesh);
        mediaMeshes.push({
          id: node.id,
          kind: 'image',
          trigger: node.trigger,
          mesh,
          revealed: !hidden,
        });
      } catch {
        console.warn(`[jrf] media node failed to load: ${node.id}`);
      }
    }

    for (const node of config.videoNodes) {
      try {
        const video = document.createElement('video');
        video.src = node.url;
        video.crossOrigin = 'anonymous';
        video.playsInline = true;
        video.muted = true;
        video.loop = node.trigger === 'loop';
        video.preload = 'auto';
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error('video load failed'));
        });
        const tex = new THREE.VideoTexture(video);
        const aspect =
          video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 9 / 16;
        const width = Math.max(0.05, node.placement.scale);
        const height = width * aspect;
        const hidden = startsHidden(node.trigger);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: hidden ? 0 : 1,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(width, height),
          mat
        );
        placeOnAnchor(mesh, node.placement);
        mesh.userData.mediaNodeId = node.id;
        anchor.add(mesh);
        mediaMeshes.push({
          id: node.id,
          kind: 'video',
          trigger: node.trigger,
          mesh,
          revealed: !hidden,
          video,
        });
        if (!hidden) void video.play().catch(() => undefined);
      } catch {
        console.warn(`[jrf] video node failed to load: ${node.id}`);
      }
    }

    for (const node of config.audioNodes) {
      const audio = new Audio(node.url);
      audio.preload = 'auto';
      audio.loop = node.trigger === 'loop';
      const p = node.placement.position;
      audioNodes.push({
        id: node.id,
        trigger: node.trigger,
        audio,
        position: new THREE.Vector3(p.x, p.y, p.z),
        started: false,
      });
      if (node.trigger === 'onDetect' || node.trigger === 'loop') {
        /* start after unlock + reveal */
      }
    }

    for (const node of config.extraModels) {
      try {
        const gltf = await loadGltf(node.url);
        const root = gltf;
        placeOnAnchor(root, node.placement);
        const s = node.placement.scale;
        root.scale.setScalar(s);
        const hidden = startsHidden(node.trigger);
        root.visible = !hidden;
        anchor.add(root);
        extraModelRoots.push({
          id: node.id,
          trigger: node.trigger,
          root,
          revealed: !hidden,
        });
      } catch {
        console.warn(`[jrf] extra model failed to load: ${node.id}`);
      }
    }
  }

  function setAudioUnlocked(next: boolean) {
    audioUnlocked = next;
    if (next && revealState === 'done') {
      for (const a of audioNodes) {
        if (
          (a.trigger === 'onDetect' || a.trigger === 'loop') &&
          !a.started
        ) {
          a.started = true;
          void a.audio.play().catch(() => undefined);
        }
      }
    }
  }

  function revealMediaNode(id: string): boolean {
    const entry = mediaMeshes.find((m) => m.id === id);
    if (!entry) {
      const model = extraModelRoots.find((m) => m.id === id);
      if (!model || model.revealed) return false;
      model.revealed = true;
      model.root.visible = true;
      return true;
    }
    if (entry.revealed && entry.trigger !== 'tap') return false;
    entry.revealed = true;
    entry.mesh.visible = true;
    const mat = entry.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 1;
    if (entry.video) void entry.video.play().catch(() => undefined);
    const audio = audioNodes.find((a) => a.id === id);
    if (audio && audioUnlocked && !audio.started) {
      audio.started = true;
      void audio.audio.play().catch(() => undefined);
    }
    return true;
  }

  function updateProximity() {
    if (revealState !== 'done' || !visible) return;
    const camera = activeCamera();
    if (!camera || !anchor) return;
    const cam = camera.position.clone();
    const thresh = 0.55;
    const tryNear = (world: THREE.Vector3, id: string, revealed: boolean) => {
      if (revealed) return;
      if (cam.distanceTo(world) < thresh) revealMediaNode(id);
    };
    for (const entry of mediaMeshes) {
      if (entry.trigger !== 'proximity' || entry.revealed) continue;
      tryNear(entry.mesh.getWorldPosition(new THREE.Vector3()), entry.id, false);
    }
    for (const m of extraModelRoots) {
      if (m.trigger !== 'proximity' || m.revealed) continue;
      tryNear(m.root.getWorldPosition(new THREE.Vector3()), m.id, false);
    }
    for (const a of audioNodes) {
      if (a.trigger !== 'proximity' || a.started || !audioUnlocked) continue;
      const world = a.position.clone();
      anchor.localToWorld(world);
      if (cam.distanceTo(world) < thresh) {
        a.started = true;
        void a.audio.play().catch(() => undefined);
      }
    }
  }

  function toggleMorph() {
    if (!config.supportsMorph) return null;
    if (revealState !== 'done') return null;
    if (!modelsReady || (!finished && !placeholder)) return null;
    hasMorphed = true;
    // Cube-only mode: still toggle UI/narration path for dry-runs.
    if (!finished || !raw) {
      morphTarget = morphTarget > 0.5 ? 0 : 1;
      if (morphTarget === 1) {
        if (placeholder) {
          (placeholder.material as THREE.MeshStandardMaterial).color.setHex(
            0x7a4cff
          );
        }
        callbacks.onEnterRaw();
        return 'RAW' as const;
      }
      if (placeholder) {
        (placeholder.material as THREE.MeshStandardMaterial).color.setHex(
          0xff6a1a
        );
      }
      callbacks.onEnterFinished();
      return 'FINISHED' as const;
    }

    morphTarget = morphTarget > 0.5 ? 0 : 1;
    if (morphTarget === 1) callbacks.onEnterRaw();
    else callbacks.onEnterFinished();
    return morphTarget === 1 ? ('RAW' as const) : ('FINISHED' as const);
  }

  function updateLabels() {
    const camera = activeCamera();
    if (!camera || !visible) return;
    if (pinRoot) faceOutlinesToCamera(pinRoot, camera);
    if (labels.length === 0) return;
    const height = viewportEl?.clientHeight || window.innerHeight;
    fitPinLabels(labels, camera, height);
    occlusionTick(() => {
      const shown = morphT > 0.5 && raw ? raw : (finished ?? placeholder);
      updateLabelOcclusion(labels, camera, shown ? [shown] : []);
    });
  }

  function updateMorph(dt: number) {
    updatePinVisibility();
    if (revealState !== 'done') return;
    if (!finished || !raw) return;
    const morphMs = Math.max(1, config.morph.durationMs);
    const overlayMs = Math.max(1, config.morph.overlayFadeMs);
    const morphSpeed = dt / (morphMs / 1000);
    const overlaySpeed = dt / (overlayMs / 1000);

    if (morphT < morphTarget) morphT = Math.min(morphTarget, morphT + morphSpeed);
    else if (morphT > morphTarget)
      morphT = Math.max(morphTarget, morphT - morphSpeed);

    if (overlayT < morphTarget)
      overlayT = Math.min(morphTarget, overlayT + overlaySpeed);
    else if (overlayT > morphTarget)
      overlayT = Math.max(morphTarget, overlayT - overlaySpeed);

    setOpacity(finished, 1 - morphT);
    setOpacity(raw, morphT);
    if (overlay) {
      const mat = overlay.material as THREE.MeshBasicMaterial;
      mat.opacity = overlayT;
    }
  }

  function positionAnchor(detail: ImageTargetDetail) {
    if (!anchor) return;
    const { position, rotation, scale } = detail;
    if (position && 'x' in position) {
      anchor.position.set(position.x, position.y, position.z);
    }
    if (rotation && 'w' in rotation) {
      anchor.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
    if (typeof scale === 'number') anchor.scale.setScalar(scale);
  }

  function pipelineModule() {
    return {
      name: 'jrf-scene',
      onStart: () => {
        if (!window.XR8) return;
        three = window.XR8.Threejs.xrScene();
        viewportEl = three.renderer.domElement;
        clock = new THREE.Clock();

        three.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.1));
        const key = new THREE.DirectionalLight(0xffffff, 0.9);
        key.position.set(1, 2, 1);
        three.scene.add(key);

        anchor = new THREE.Group();
        anchor.visible = false;
        three.scene.add(anchor);

        void loadModels();

        window.XR8.XrController.updateCameraProjectionMatrix({
          origin: three.camera.position,
          facing: three.camera.quaternion,
        });
      },
      onUpdate: () => {
        const dt = clock ? clock.getDelta() : 0.016;
        updateReveal(dt);
        updatePostRevealFade(dt);
        updateProximity();
        updateMorph(dt);
        updateLabels();
      },
    };
  }

  function isConfiguredTarget(detail?: { name?: string }) {
    return detail?.name === config.imageTargetName;
  }

  function onImageFound(detail: ImageTargetDetail) {
    if (!isConfiguredTarget(detail)) return;
    positionAnchor(detail);
    clearTrackingGraceTimer();
    cancelPostRevealFade();
    if (!hasLocked) {
      hasLocked = true;
      mark('first_target_found');
    }

    if (revealState === 'done') {
      if (anchor) anchor.visible = true;
      visible = true;
      applyMorphOpacities();
      updatePinVisibility();
      if (!hasMorphed) callbacks.onState('ANCHORED');
      else callbacks.onState(morphTarget > 0.5 ? 'RAW' : 'FINISHED');
      return;
    }

    if (revealState === 'playing' || revealState === 'waiting') {
      if (anchor) anchor.visible = true;
      visible = true;
      return;
    }

    scheduleReveal();
  }

  function onImageUpdated(detail: ImageTargetDetail) {
    if (!isConfiguredTarget(detail) || poseHeld) return;
    positionAnchor(detail);
  }

  function onImageLost(detail?: { name?: string }) {
    if (!isConfiguredTarget(detail)) return;
    if (revealState === 'waiting' || revealState === 'playing') {
      // Brief flicker: wait before canceling densify.
      if (trackingGraceTimer !== null) return;
      trackingGraceTimer = setTimeout(() => {
        trackingGraceTimer = null;
        if (revealState !== 'waiting' && revealState !== 'playing') return;
        cancelReveal();
        callbacks.onState('SCANNING');
      }, REVEAL.trackingGraceMs);
      return;
    }
    if (revealState === 'done') {
      // Soft fade instead of an instant cut once Arrive chrome is up.
      beginPostRevealFade();
      return;
    }
    callbacks.onState('SCANNING');
  }

  function activeCamera() {
    return stageCamera ?? three?.camera ?? null;
  }

  /**
   * Pin under the tap. Editing views pass `includeLabels: false` so taps on a
   * floating title fall through to the sculpture.
   */
  function pickPin(
    ndcX: number,
    ndcY: number,
    { includeLabels = true }: { includeLabels?: boolean } = {}
  ): string | null {
    const camera = activeCamera();
    if (revealState !== 'done') return null;
    if (!camera || !visible || pinHits.length === 0) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const shownIds = new Set(pinGroups.filter((g) => g.group.visible).map((g) => g.id));
    const targets: THREE.Object3D[] = [
      ...pinHits,
      ...(includeLabels ? labels.map((l) => l.sprite) : []),
    ].filter((o) => shownIds.has(o.userData.pinId));
    const hit = raycaster.intersectObjects(targets, false)[0];
    const id = hit?.object.userData.pinId;
    return typeof id === 'string' ? id : null;
  }

  /** Tap-trigger media / extra model under the cursor; reveals it when hit. */
  function pickMediaNode(ndcX: number, ndcY: number): string | null {
    const camera = activeCamera();
    if (revealState !== 'done') return null;
    if (!camera || !visible) return null;
    const pendingMeshes = mediaMeshes.filter(
      (m) => m.trigger === 'tap' && !m.revealed
    );
    const pendingModels = extraModelRoots.filter(
      (m) => m.trigger === 'tap' && !m.revealed
    );
    if (pendingMeshes.length === 0 && pendingModels.length === 0) {
      // Tap audio with no mesh: play nearest pending tap audio
      for (const a of audioNodes) {
        if (a.trigger === 'tap' && !a.started && audioUnlocked) {
          a.started = true;
          void a.audio.play().catch(() => undefined);
          return a.id;
        }
      }
      return null;
    }
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const targets: THREE.Object3D[] = [
      ...pendingMeshes.map((m) => m.mesh),
      ...pendingModels.map((m) => m.root),
    ];
    const hit = raycaster.intersectObjects(targets, true)[0];
    if (!hit) return null;
    let obj: THREE.Object3D | null = hit.object;
    while (obj) {
      const id = obj.userData.mediaNodeId as string | undefined;
      if (id) {
        revealMediaNode(id);
        return id;
      }
      const model = pendingModels.find((m) => m.root === obj);
      if (model) {
        revealMediaNode(model.id);
        return model.id;
      }
      obj = obj.parent;
    }
    return null;
  }

  /** Point on the form currently showing, in the pins' (GLB-root) space. */
  function pickSurface(
    ndcX: number,
    ndcY: number
  ): { point: { x: number; y: number; z: number }; form: 'finished' | 'raw' } | null {
    const camera = activeCamera();
    if (!camera || !visible || !piece) return null;
    const form = showingForm();
    const target = form === 'raw' && raw ? raw : finished;
    if (!target) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const hit = raycaster.intersectObject(target, true)[0];
    if (!hit) return null;
    const local = piece.worldToLocal(hit.point.clone());
    return { point: { x: local.x, y: local.y, z: local.z }, form };
  }

  /** Screen position of a pin in normalized device coordinates. */
  function pinNdc(id: string): { x: number; y: number } | null {
    const camera = activeCamera();
    const g = pinGroups.find((p) => p.id === id);
    if (!camera || !g) return null;
    const v = g.group.getWorldPosition(new THREE.Vector3()).project(camera);
    return { x: v.x, y: v.y };
  }

  /** Project GLB-root local position to NDC (for CTA overlays). */
  function projectLocal(pos: {
    x: number;
    y: number;
    z: number;
  }): { x: number; y: number } | null {
    const camera = activeCamera();
    if (!camera || !piece || !visible) return null;
    const v = new THREE.Vector3(pos.x, pos.y, pos.z);
    piece.localToWorld(v);
    v.project(camera);
    return { x: v.x, y: v.y };
  }

  function setPins(next: ScenePin[]) {
    pins = next;
    rebuildPins();
  }

  function setSelectedPin(id: string | null) {
    if (selectedPinId === id) return;
    selectedPinId = id;
    rebuildPins();
  }

  /**
   * Desktop stand-in: same piece, pins, and morph, without the camera pipeline.
   */
  function startStage(canvas: HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0c, 1);

    const scene = new THREE.Scene();
    stageScene = scene;
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    stageCamera = camera;
    viewportEl = canvas;
    camera.position.set(0, 0.2, 2);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(1.2, 2.2, 1.6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff2e4, 0.7);
    fill.position.set(-1.4, 0.6, 1.8);
    scene.add(fill);

    anchor = new THREE.Group();
    scene.add(anchor);
    visible = true;
    clock = new THREE.Clock();

    function resize() {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    resize();
    window.addEventListener('resize', resize);
    renderer.setClearColor(0x161412, 1);
    void loadModels();

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const dt = clock ? clock.getDelta() : 0.016;
      updateReveal(dt);
      updatePostRevealFade(dt);
      updateProximity();
      updateMorph(dt);
      updateLabels();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      clearStageBackdrop?.();
      clearStageBackdrop = null;
      stageScene = null;
      stageCamera = null;
    };
  }

  return {
    pipelineModule,
    onImageFound,
    onImageUpdated,
    onImageLost,
    toggleMorph,
    pickPin,
    pickMediaNode,
    pickSurface,
    pinNdc,
    projectLocal,
    setPins,
    setSelectedPin,
    setAudioUnlocked,
    holdPose: (on: boolean) => {
      poseHeld = on;
    },
    showingForm,
    hasRawModel: () => raw !== null,
    startStage,
    isVisible: () => visible,
    isModelsReady: () => modelsReady,
    isRevealComplete: () => revealState === 'done',
    isRevealing: () =>
      revealState === 'playing' || revealState === 'waiting',
  };
}

export type JrfScene = ReturnType<typeof createScene>;
