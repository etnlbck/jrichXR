/*
 * scene.js — Three.js content + the raw↔finished morph.
 *
 * Exposes window.JRFScene with:
 *   - pipelineModule()  : 8th Wall camera-pipeline module (onStart / onUpdate)
 *   - onImageFound/Updated/Lost : marker event handlers (called from app.js)
 *
 * The morph is a cross-fade between two CO-LOCATED meshes (finished + raw).
 * They MUST share origin, up-axis and scale from export, or the effect breaks.
 */
window.JRFScene = (function () {
  'use strict';

  const cfg = window.JRF_CONFIG;

  let three = null;        // { scene, camera, renderer } from XR8.Threejs.xrScene()
  let anchor = null;       // group placed at the marker
  let finished = null;     // THREE.Object3D
  let raw = null;          // THREE.Object3D
  let overlay = null;      // THREE.Mesh (guide-mark plane)
  let loaded = false;
  let visible = false;

  // morph state
  let morphT = 0;          // 0 = finished, 1 = raw
  let morphTarget = 0;
  let clock = null;

  function setOpacity(obj, o) {
    obj.traverse((n) => {
      if (n.isMesh && n.material) {
        n.material.transparent = true;
        n.material.opacity = o;
        n.visible = o > 0.001;
      }
    });
  }

  function loadModels() {
    const loader = new THREE.GLTFLoader();

    loader.load(cfg.assets.finishedModel, (g) => {
      finished = g.scene;
      applyPlacement(finished);
      anchor.add(finished);
      setOpacity(finished, 1);
    });

    loader.load(cfg.assets.rawModel, (g) => {
      raw = g.scene;
      applyPlacement(raw);
      anchor.add(raw);
      setOpacity(raw, 0); // hidden until morph
    });

    // Guide-mark overlay as a textured, additive-ish plane that fades in with raw.
    const tex = new THREE.TextureLoader().load(cfg.assets.overlay);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    overlay = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), mat);
    overlay.position.set(cfg.placement.position.x, cfg.placement.position.y + 0.2, cfg.placement.position.z + 0.05);
    anchor.add(overlay);

    loaded = true;
  }

  function applyPlacement(obj) {
    const p = cfg.placement;
    obj.position.set(p.position.x, p.position.y, p.position.z);
    obj.rotation.set(
      THREE.MathUtils.degToRad(p.rotationDeg.x),
      THREE.MathUtils.degToRad(p.rotationDeg.y),
      THREE.MathUtils.degToRad(p.rotationDeg.z)
    );
    obj.scale.setScalar(p.scale);
  }

  // ── Public: morph control (called by ui.js on tap) ────────────────────────
  function toggleMorph() {
    morphTarget = morphTarget > 0.5 ? 0 : 1;
    if (morphTarget === 1) {
      window.JRFUi.onEnterRaw();   // triggers narration + provenance sequencing
    } else {
      window.JRFUi.onEnterFinished();
    }
    return morphTarget === 1 ? 'RAW' : 'FINISHED';
  }

  function updateMorph(dt) {
    if (!finished || !raw) return;
    const speed = dt / (cfg.morph.durationMs / 1000);
    if (morphT < morphTarget) morphT = Math.min(morphTarget, morphT + speed);
    else if (morphT > morphTarget) morphT = Math.max(morphTarget, morphT - speed);

    setOpacity(finished, 1 - morphT);
    setOpacity(raw, morphT);
    if (overlay) overlay.material.opacity = morphT;
  }

  // ── 8th Wall pipeline module ──────────────────────────────────────────────
  function pipelineModule() {
    return {
      name: 'jrf-scene',
      onStart: ({ canvas }) => {
        three = XR8.Threejs.xrScene(); // { scene, camera, renderer }
        clock = new THREE.Clock();

        // Lighting for the model (camera feed provides the backdrop).
        three.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.1));
        const key = new THREE.DirectionalLight(0xffffff, 0.9);
        key.position.set(1, 2, 1);
        three.scene.add(key);

        // Anchor group — repositioned to the marker on every imageupdated.
        anchor = new THREE.Group();
        anchor.visible = false;
        three.scene.add(anchor);

        loadModels();

        // Prevent auto-render; we drive it in onUpdate for morph timing.
        XR8.XrController.updateCameraProjectionMatrix({
          origin: three.camera.position,
          facing: three.camera.quaternion,
        });
      },
      onUpdate: () => {
        const dt = clock ? clock.getDelta() : 0.016;
        updateMorph(dt);
      },
      onRender: () => {
        if (three) three.renderer.render(three.scene, three.camera);
      },
    };
  }

  // ── Marker event handlers (from app.js) ───────────────────────────────────
  function positionAnchor(detail) {
    if (!anchor) return;
    const { position, rotation, scale } = detail;
    anchor.position.copy(position);
    anchor.quaternion.copy(rotation);
    if (scale) anchor.scale.setScalar(scale);
  }

  function onImageFound(detail) {
    positionAnchor(detail);
    anchor.visible = true;
    visible = true;
    window.JRFUi.setState('ANCHORED');
  }

  function onImageUpdated(detail) {
    positionAnchor(detail);
  }

  function onImageLost() {
    anchor.visible = false;
    visible = false;
    window.JRFUi.setState('SCANNING');
    // Note: morphT / morphTarget are preserved so re-acquiring the marker
    // resumes the story rather than restarting it.
  }

  return {
    pipelineModule,
    onImageFound,
    onImageUpdated,
    onImageLost,
    toggleMorph,
    isVisible: () => visible,
    isLoaded: () => loaded,
  };
})();
