'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SpatialPin } from '@jrichforms/experience';
import styles from '@/app/admin/admin.module.css';

type Props = {
  modelUrl: string | null;
  dracoDecoderPath: string;
  pins: SpatialPin[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddPin: (position: SpatialPin['position']) => void;
  onMovePin: (id: string, position: SpatialPin['position']) => void;
};

type PinMarker = {
  id: string;
  group: THREE.Group;
  dot: THREE.Mesh;
};

const DOT = 0xffc46a;
const DOT_SELECTED = 0xffe8b8;

export default function PinPlacer({
  modelUrl,
  dracoDecoderPath,
  pins,
  selectedId,
  onSelect,
  onAddPin,
  onMovePin,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pinsRef = useRef(pins);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onAddPinRef = useRef(onAddPin);
  const onMovePinRef = useRef(onMovePin);
  const syncPinsRef = useRef<(next: SpatialPin[], selected: string | null) => void>(
    () => {}
  );

  pinsRef.current = pins;
  selectedRef.current = selectedId;
  onSelectRef.current = onSelect;
  onAddPinRef.current = onAddPin;
  onMovePinRef.current = onMovePin;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !modelUrl) return;
    const host = mount;

    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x14110e, 1);
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
    let model: THREE.Object3D | null = null;
    let pinRadius = 0.012;
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

    function makePinMesh(id: string, selected: boolean) {
      const group = new THREE.Group();
      group.userData.pinId = id;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(pinRadius, 16, 12),
        new THREE.MeshBasicMaterial({ color: selected ? DOT_SELECTED : DOT })
      );
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(pinRadius * 3, 8, 8),
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
      return { id, group, dot };
    }

    function syncPins(next: SpatialPin[], selected: string | null) {
      if (!model) return;
      const ids = new Set(next.map((p) => p.id));
      for (let i = markers.length - 1; i >= 0; i--) {
        if (!ids.has(markers[i].id)) {
          pinRoot.remove(markers[i].group);
          markers.splice(i, 1);
        }
      }
      for (const pin of next) {
        let marker = markers.find((m) => m.id === pin.id);
        if (!marker) {
          marker = makePinMesh(pin.id, pin.id === selected);
          markers.push(marker);
          pinRoot.add(marker.group);
        }
        marker.group.position.set(pin.position.x, pin.position.y, pin.position.z);
        const mat = marker.dot.material as THREE.MeshBasicMaterial;
        mat.color.setHex(pin.id === selected ? DOT_SELECTED : DOT);
      }
    }

    syncPinsRef.current = syncPins;

    function ndcFromEvent(ev: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function hitPins() {
      const objs = markers.map((m) => m.group);
      return raycaster.intersectObjects(objs, true);
    }

    function hitModel() {
      if (!model) return [];
      return raycaster.intersectObject(model, true);
    }

    function localHit(point: THREE.Vector3) {
      return modelRoot.worldToLocal(point.clone());
    }

    function onPointerDown(ev: PointerEvent) {
      if (ev.button !== 0) return;
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
      onAddPinRef.current({ x: local.x, y: local.y, z: local.z });
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerUp);

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(dracoDecoderPath);
    loader.setDRACOLoader(draco);

    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        modelRoot.add(model);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        pinRadius = Math.max(0.008, Math.max(size.x, size.y, size.z) * 0.018);
        const radius = Math.max(size.x, size.y, size.z) * 0.9 || 0.4;
        camera.position.copy(center).add(new THREE.Vector3(radius, radius * 0.6, radius * 1.2));
        controls.target.copy(center);
        controls.update();
        syncPins(pinsRef.current, selectedRef.current);
      },
      undefined,
      (err) => {
        console.warn('[jrf] pin placer failed to load GLB', err);
      }
    );

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerUp);
      controls.dispose();
      draco.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      syncPinsRef.current = () => {};
    };
  }, [modelUrl, dracoDecoderPath]);

  useEffect(() => {
    syncPinsRef.current(pins, selectedId);
  }, [pins, selectedId]);

  if (!modelUrl) {
    return (
      <p className={styles.status}>
        Upload a finished GLB before placing pins on the sculpture.
      </p>
    );
  }

  return (
    <div>
      <div ref={mountRef} className={styles.pinViewport} />
      <p className={styles.status}>
        Click the sculpture to drop a pin. Click a pin to select it, then drag
        to slide it along the surface.
      </p>
    </div>
  );
}
