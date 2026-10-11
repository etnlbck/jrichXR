import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { AppConfig } from './config';
import { mark } from './metrics';
import type { ImageTargetDetail, UiState } from './types';

export type SceneCallbacks = {
  onState: (state: UiState) => void;
  onEnterRaw: () => void;
  onEnterFinished: () => void;
  onLoadError: (message: string) => void;
  onModelsReady: () => void;
};

/**
 * Three.js content + raw↔finished morph, driven by the 8th Wall camera pipeline.
 */
export function createScene(config: AppConfig, callbacks: SceneCallbacks) {
  let three: ReturnType<NonNullable<Window['XR8']>['Threejs']['xrScene']> | null =
    null;
  let anchor: THREE.Group | null = null;
  let piece: THREE.Group | null = null;
  let finished: THREE.Object3D | null = null;
  let raw: THREE.Object3D | null = null;
  let overlay: THREE.Mesh | null = null;
  let placeholder: THREE.Mesh | null = null;
  const pinHits: THREE.Object3D[] = [];
  let stageCamera: THREE.PerspectiveCamera | null = null;
  let modelsReady = false;
  let visible = false;
  let morphT = 0;
  let morphTarget = 0;
  /** Overlay opacity follows morph, timed by gallery.morph.overlayFadeMs. */
  let overlayT = 0;
  let clock: THREE.Clock | null = null;

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

  function addPins(parent: THREE.Object3D, radius: number) {
    for (const pin of config.pins) {
      const group = new THREE.Group();
      group.position.set(pin.position.x, pin.position.y, pin.position.z);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xffc46a })
      );
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 3, 8, 8),
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
      parent.add(group);
      pinHits.push(dot, hit);
    }
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
    modelsReady = true;
    mark('models_ready_cube');
    frameStageCamera();
    callbacks.onModelsReady();
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
      setOpacity(finished, 1);
      mark('finished_model_loaded');

      if (hasRaw) {
        raw = await loadGltf(config.assets.rawModel);
        if (config.assets.interimRaw) {
          applyInterimRawLook(raw);
          console.info(
            '[jrf] raw.glb is interim (duplicate mesh + cool tint). Replace with aligned raw stone.'
          );
        }
        piece.add(raw);
        setOpacity(raw, 0);
        mark('raw_model_loaded');
      }

      const box = new THREE.Box3().setFromObject(finished);
      const size = box.getSize(new THREE.Vector3());
      const pinRadius = Math.max(
        0.008,
        Math.max(size.x, size.y, size.z) * 0.018
      );
      addPins(piece, pinRadius);

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

      modelsReady = true;
      mark('models_ready');
      frameStageCamera();
      callbacks.onModelsReady();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load 3D models';
      callbacks.onLoadError(message);
      makePlaceholderCube();
    } finally {
      draco.dispose();
    }
  }

  function toggleMorph() {
    if (!modelsReady || (!finished && !placeholder)) return null;
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

  function updateMorph(dt: number) {
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
        updateMorph(dt);
      },
    };
  }

  function onImageFound(detail: ImageTargetDetail) {
    positionAnchor(detail);
    if (anchor) anchor.visible = true;
    visible = true;
    mark('first_target_found');
    callbacks.onState('ANCHORED');
  }

  function onImageUpdated(detail: ImageTargetDetail) {
    positionAnchor(detail);
  }

  function onImageLost() {
    if (anchor) anchor.visible = false;
    visible = false;
    callbacks.onState('SCANNING');
  }

  function pickPin(ndcX: number, ndcY: number): string | null {
    const camera = stageCamera ?? three?.camera ?? null;
    if (!camera || !visible || pinHits.length === 0) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const hit = raycaster.intersectObjects(pinHits, true)[0];
    const id = hit?.object.userData.pinId;
    return typeof id === 'string' ? id : null;
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
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    stageCamera = camera;
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
      updateMorph(dt);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      renderer.dispose();
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
    startStage,
    isVisible: () => visible,
    isModelsReady: () => modelsReady,
  };
}

export type JrfScene = ReturnType<typeof createScene>;
