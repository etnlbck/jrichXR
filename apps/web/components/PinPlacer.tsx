'use client';

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DEFAULT_PIN_COLOR, pinShowsOn, type SpatialPin } from '@jrichforms/experience';
import { faceOutlinesToCamera, makePinOutline, pinColors } from '@/lib/pin-color';
import {
  disposePinLabel,
  fitPinLabels,
  makePinLabel,
  setLabelBaseOpacity,
  throttleMs,
  updateLabelOcclusion,
  type PinLabel,
} from '@/lib/pin-label';
import { applyStageBackdrop, estimateModelLuminance } from '@/lib/stage-backdrop';
import styles from '@/app/admin/admin.module.css';

type ShownForm = 'finished' | 'raw';

type Props = {
  modelUrl: string | null;
  rawModelUrl?: string | null;
  dracoDecoderPath: string;
  pins: SpatialPin[];
  selectedId: string | null;
  showing: ShownForm;
  onSelect: (id: string | null) => void;
  onAddPin: (position: SpatialPin['position'], form: ShownForm) => void;
  onMovePin: (id: string, position: SpatialPin['position']) => void;
  /** `#rrggbb` for pin dots and leader lines. */
  pinColor?: string;
  /** Brightness (0–1) of the finished model, reported once it loads. */
  onModelLuminance?: (value: number) => void;
};

type PinMarker = {
  id: string;
  group: THREE.Group;
  dot: THREE.Mesh;
  outline: THREE.Mesh;
  label: PinLabel | null;
  /** Title, selected state and color the label was drawn with. */
  labelKey: string;
};

const COARSE_QUERY = '(pointer: coarse)';

function isCoarsePointer() {
  return window.matchMedia(COARSE_QUERY).matches;
}

function subscribeCoarsePointer(onChange: () => void) {
  const query = window.matchMedia(COARSE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export default function PinPlacer({
  modelUrl,
  rawModelUrl = null,
  dracoDecoderPath,
  pins,
  selectedId,
  showing,
  onSelect,
  onAddPin,
  onMovePin,
  pinColor = DEFAULT_PIN_COLOR,
  onModelLuminance,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pinsRef = useRef(pins);
  const selectedRef = useRef(selectedId);
  const showingRef = useRef(showing);
  const onSelectRef = useRef(onSelect);
  const onAddPinRef = useRef(onAddPin);
  const onMovePinRef = useRef(onMovePin);
  const pinColorRef = useRef(pinColor);
  const onModelLuminanceRef = useRef(onModelLuminance);
  const syncPinsRef = useRef<(next: SpatialPin[], selected: string | null) => void>(
    () => {}
  );
  const showFormRef = useRef<(form: ShownForm) => void>(() => {});
  const coarse = useSyncExternalStore(
    subscribeCoarsePointer,
    isCoarsePointer,
    () => false
  );

  useLayoutEffect(() => {
    pinsRef.current = pins;
    selectedRef.current = selectedId;
    showingRef.current = showing;
    onSelectRef.current = onSelect;
    onAddPinRef.current = onAddPin;
    onMovePinRef.current = onMovePin;
    pinColorRef.current = pinColor;
    onModelLuminanceRef.current = onModelLuminance;
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !modelUrl) return;
    const host = mount;

    let disposed = false;
    const hitScale = isCoarsePointer() ? 5 : 3;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x14110e, 1);
    renderer.domElement.style.touchAction = 'none';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x443322, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(2, 3, 2);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    camera.position.set(0.6, 0.4, 0.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.15, 0);

    const modelRoot = new THREE.Group();
    scene.add(modelRoot);

    const pinRoot = new THREE.Group();
    scene.add(pinRoot);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const markers: PinMarker[] = [];
    let finishedModel: THREE.Object3D | null = null;
    let rawModel: THREE.Object3D | null = null;
    let model: THREE.Object3D | null = null;
    let pinRadius = 0.012;
    let clearBackdrop: (() => void) | null = null;

    function showForm(form: ShownForm) {
      model = form === 'raw' && rawModel ? rawModel : finishedModel;
      if (finishedModel) finishedModel.visible = model === finishedModel;
      if (rawModel) rawModel.visible = model === rawModel;
      syncPins(pinsRef.current, selectedRef.current);
    }
    let draggingId: string | null = null;
    let pointerDown: { x: number; y: number; pinId: string | null } | null =
      null;

    function resize() {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    function makePinMesh(id: string) {
      const group = new THREE.Group();
      group.userData.pinId = id;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(pinRadius, 16, 12),
        new THREE.MeshBasicMaterial({ transparent: true })
      );
      // Child of the dot so it grows with the selected dot.
      const outline = makePinOutline(pinRadius, 0x000000);
      (outline.material as THREE.MeshBasicMaterial).transparent = true;
      outline.userData.pinId = id;
      dot.add(outline);
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(pinRadius * hitScale, 8, 8),
        new THREE.MeshBasicMaterial({
          visible: false,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      hit.userData.pinId = id;
      dot.userData.pinId = id;
      group.add(dot);
      group.add(hit);
      return { id, group, dot, outline, label: null, labelKey: '' };
    }

    function syncLabel(marker: PinMarker, title: string, selected: boolean, color: string) {
      const key = `${selected ? 1 : 0}:${color}:${title}`;
      if (marker.labelKey === key) return;
      if (marker.label) disposePinLabel(marker.label);
      marker.label = makePinLabel(marker.id, title, { radius: pinRadius, selected, color });
      marker.labelKey = key;
      if (marker.label) marker.group.add(marker.label.root);
    }

    function removeMarker(marker: PinMarker) {
      if (marker.label) disposePinLabel(marker.label);
      pinRoot.remove(marker.group);
    }

    function syncPins(next: SpatialPin[], selected: string | null) {
      if (!model) return;
      const ids = new Set(next.map((p) => p.id));
      const color = pinColorRef.current;
      const colors = pinColors(color);
      for (let i = markers.length - 1; i >= 0; i--) {
        if (!ids.has(markers[i].id)) {
          removeMarker(markers[i]);
          markers.splice(i, 1);
        }
      }
      for (const pin of next) {
        let marker = markers.find((m) => m.id === pin.id);
        if (!marker) {
          marker = makePinMesh(pin.id);
          markers.push(marker);
          pinRoot.add(marker.group);
        }
        const isSelected = pin.id === selected;
        marker.group.position.set(pin.position.x, pin.position.y, pin.position.z);
        marker.dot.scale.setScalar(isSelected ? 1.4 : 1);
        const opacity = pinShowsOn(pin, showingRef.current) ? 1 : 0.3;
        const mat = marker.dot.material as THREE.MeshBasicMaterial;
        mat.color.setHex(isSelected ? colors.selected : colors.dot);
        mat.opacity = opacity;
        const outlineMat = marker.outline.material as THREE.MeshBasicMaterial;
        outlineMat.color.setHex(colors.outline);
        outlineMat.opacity = opacity;
        syncLabel(marker, pin.title, isSelected, color);
        if (marker.label) setLabelBaseOpacity(marker.label, opacity);
      }
    }

    function currentLabels() {
      const out: PinLabel[] = [];
      for (const m of markers) if (m.label) out.push(m.label);
      return out;
    }
    const occlusionTick = throttleMs(200);

    syncPinsRef.current = syncPins;
    showFormRef.current = showForm;

    function ndcFromEvent(ev: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /** Dots and hit spheres only; clicks pass through floating titles. */
    function hitPins() {
      const objs = markers.map((m) => m.group);
      return raycaster
        .intersectObjects(objs, true)
        .filter((hit) => !hit.object.userData.isPinLabel);
    }

    function hitModel() {
      if (!model) return [];
      return raycaster.intersectObject(model, true);
    }

    function localHit(point: THREE.Vector3) {
      return modelRoot.worldToLocal(point.clone());
    }

    function onPointerDown(ev: PointerEvent) {
      if (ev.button !== 0 || !ev.isPrimary) return;
      ndcFromEvent(ev);
      raycaster.setFromCamera(pointer, camera);
      const pinHit = hitPins()[0];
      const pinId = pinHit?.object.userData.pinId as string | undefined;
      pointerDown = {
        x: ev.clientX,
        y: ev.clientY,
        pinId: pinId ?? null,
      };
      if (pinId && pinId === selectedRef.current) {
        draggingId = pinId;
        controls.enabled = false;
      }
    }

    function onPointerMove(ev: PointerEvent) {
      if (!draggingId || !model) return;
      ndcFromEvent(ev);
      raycaster.setFromCamera(pointer, camera);
      const hit = hitModel()[0];
      if (!hit) return;
      const local = localHit(hit.point);
      onMovePinRef.current(draggingId, {
        x: local.x,
        y: local.y,
        z: local.z,
      });
    }

    function onPointerUp(ev: PointerEvent) {
      const down = pointerDown;
      pointerDown = null;
      const wasDragging = draggingId;
      draggingId = null;
      controls.enabled = true;
      if (!down) return;
      const dx = ev.clientX - down.x;
      const dy = ev.clientY - down.y;
      if (dx * dx + dy * dy > 25) return;
      if (wasDragging) return;

      ndcFromEvent(ev);
      raycaster.setFromCamera(pointer, camera);
      const pinHit = hitPins()[0];
      const pinId = pinHit?.object.userData.pinId as string | undefined;
      if (pinId) {
        onSelectRef.current(pinId);
        return;
      }
      const meshHit = hitModel()[0];
      if (!meshHit) return;
      const local = localHit(meshHit.point);
      const form = model === rawModel && rawModel ? 'raw' : 'finished';
      onAddPinRef.current({ x: local.x, y: local.y, z: local.z }, form);
    }

    /** Leaving the canvas or a cancelled touch ends a drag but never counts as a tap. */
    function onPointerCancel() {
      pointerDown = null;
      draggingId = null;
      controls.enabled = true;
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerCancel);
    renderer.domElement.addEventListener('pointercancel', onPointerCancel);

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(dracoDecoderPath);
    loader.setDRACOLoader(draco);

    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        finishedModel = gltf.scene;
        modelRoot.add(finishedModel);
        clearBackdrop = applyStageBackdrop(scene, finishedModel);
        onModelLuminanceRef.current?.(estimateModelLuminance(finishedModel));
        const box = new THREE.Box3().setFromObject(finishedModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        pinRadius = Math.max(0.008, Math.max(size.x, size.y, size.z) * 0.018);
        const radius = Math.max(size.x, size.y, size.z) * 0.9 || 0.4;
        camera.position.copy(center).add(new THREE.Vector3(radius, radius * 0.6, radius * 1.2));
        controls.target.copy(center);
        controls.update();
        showForm(showingRef.current);
      },
      undefined,
      (err) => {
        console.warn('[jrf] pin placer failed to load GLB', err);
      }
    );

    if (rawModelUrl) {
      loader.load(
        rawModelUrl,
        (gltf) => {
          if (disposed) return;
          rawModel = gltf.scene;
          rawModel.visible = false;
          modelRoot.add(rawModel);
          if (finishedModel) showForm(showingRef.current);
        },
        undefined,
        (err) => {
          console.warn('[jrf] pin placer failed to load raw GLB', err);
        }
      );
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      camera.updateMatrixWorld();
      faceOutlinesToCamera(pinRoot, camera);
      const labels = currentLabels();
      if (labels.length > 0) {
        fitPinLabels(labels, camera, host.clientHeight);
        occlusionTick(() => updateLabelOcclusion(labels, camera, model ? [model] : []));
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      for (const m of markers) removeMarker(m);
      markers.length = 0;
      clearBackdrop?.();
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerCancel);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      controls.dispose();
      draco.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      syncPinsRef.current = () => {};
      showFormRef.current = () => {};
    };
  }, [modelUrl, rawModelUrl, dracoDecoderPath]);

  useEffect(() => {
    syncPinsRef.current(pins, selectedId);
  }, [pins, selectedId, pinColor]);

  useEffect(() => {
    showFormRef.current(showing);
  }, [showing]);

  if (!modelUrl) {
    return (
      <p className={styles.status}>
        Upload a finished GLB before placing pins on the model.
      </p>
    );
  }

  return (
    <div>
      <div ref={mountRef} className={styles.pinViewport} />
      <p className={styles.status}>
        {coarse
          ? 'Tap the model to drop a pin. Tap a pin to select it, then drag it to slide along the surface. Drag elsewhere to orbit; pinch to zoom.'
          : 'Click the model to drop a pin. Click a pin to select it, then drag to slide it along the surface.'}{' '}
        Pins that belong to the other form are dimmed.
      </p>
    </div>
  );
}
