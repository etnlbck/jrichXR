import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { config } from './config';
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
export function createScene(callbacks: SceneCallbacks) {
  let three: ReturnType<NonNullable<Window['XR8']>['Threejs']['xrScene']> | null =
    null;
  let anchor: THREE.Group | null = null;
  let finished: THREE.Object3D | null = null;
  let raw: THREE.Object3D | null = null;
  let overlay: THREE.Mesh | null = null;
  let placeholder: THREE.Mesh | null = null;
  let modelsReady = false;
  let visible = false;
  let morphT = 0;
  let morphTarget = 0;
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
    callbacks.onModelsReady();
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
      finished = await loadGltf(config.assets.finishedModel);
      applyPlacement(finished);
      anchor.add(finished);
      setOpacity(finished, 1);
      mark('finished_model_loaded');

      if (hasRaw) {
        raw = await loadGltf(config.assets.rawModel);
        applyPlacement(raw);
        anchor.add(raw);
        setOpacity(raw, 0);
        mark('raw_model_loaded');
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
        overlay = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), mat);
        overlay.position.set(
          config.placement.position.x,
          config.placement.position.y + 0.2,
          config.placement.position.z + 0.05
        );
        anchor.add(overlay);
      }

      modelsReady = true;
      mark('models_ready');
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
    const speed = dt / (config.morph.durationMs / 1000);
    if (morphT < morphTarget) morphT = Math.min(morphTarget, morphT + speed);
    else if (morphT > morphTarget)
      morphT = Math.max(morphTarget, morphT - speed);

    setOpacity(finished, 1 - morphT);
    setOpacity(raw, morphT);
    if (overlay) {
      const mat = overlay.material as THREE.MeshBasicMaterial;
      mat.opacity = morphT;
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

  return {
    pipelineModule,
    onImageFound,
    onImageUpdated,
    onImageLost,
    toggleMorph,
    isVisible: () => visible,
    isModelsReady: () => modelsReady,
  };
}

export type JrfScene = ReturnType<typeof createScene>;
