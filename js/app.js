/*
 * app.js — boots the 8th Wall engine pipeline for IMAGE-TARGET-ONLY tracking.
 *
 * Why image-target-only: polished obsidian defeats markerless SLAM, and the
 * image-target module lives in the MIT-licensed engine package. With world
 * tracking disabled we stay in open source and avoid the SLAM binary.
 *
 * The `XR8` / `XRExtras` globals below follow 8th Wall's documented pipeline-
 * module API. If the open-source engine renames these, adjust in ONE place
 * here. Verify against https://8thwall.org/docs/engine/overview (Milestone 0).
 */
(function () {
  'use strict';

  const cfg = window.JRF_CONFIG;

  // Assembled once the engine global is present.
  function onEngineReady() {
    // Configure the controller: recognise our marker(s), skip world tracking.
    XR8.XrController.configure({
      imageTargets: cfg.imageTargets,
      disableWorldTracking: true, // pure image tracking — no SLAM binary needed
    });

    XR8.addCameraPipelineModules([
      // 8th Wall provided modules
      XR8.GlTextureRenderer.pipelineModule(), // draws the camera feed
      XR8.Threejs.pipelineModule(),           // creates a three.js scene bound to the camera
      XR8.XrController.pipelineModule(),       // 6DoF + image-target events
      XRExtras.FullWindowCanvas.pipelineModule(),
      XRExtras.Loading.pipelineModule(),
      XRExtras.RuntimeError.pipelineModule(),

      // Our modules
      window.JRFScene.pipelineModule(),        // builds/updates the 3D content
      imageTargetModule(),                     // routes marker events to the scene
    ]);

    XR8.run({ canvas: document.getElementById('camerafeed') });
  }

  // Bridges engine image-target events to our scene + UI.
  function imageTargetModule() {
    return {
      name: 'jrf-image-target',
      listeners: [
        { event: 'reality.imagefound', process: ({ detail }) => window.JRFScene.onImageFound(detail) },
        { event: 'reality.imageupdated', process: ({ detail }) => window.JRFScene.onImageUpdated(detail) },
        { event: 'reality.imagelost', process: ({ detail }) => window.JRFScene.onImageLost(detail) },
      ],
    };
  }

  // ── Start gate ────────────────────────────────────────────────────────────
  // iOS Safari needs a user gesture before camera + audio. We wait for a tap,
  // then unlock the narration element and start the engine.
  function wireStartGate() {
    const gate = document.getElementById('start-gate');
    const btn = document.getElementById('start-btn');

    btn.addEventListener('click', () => {
      // Unlock audio inside the gesture (play muted, then reset).
      window.JRFUi.unlockAudio();
      gate.classList.add('hidden');
      window.JRFUi.setState('SCANNING');

      // The engine may still be loading; XRExtras.Loading coordinates that.
      if (window.XR8) {
        onEngineReady();
      } else {
        window.addEventListener('xrloaded', onEngineReady, { once: true });
      }
    }, { once: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.JRFUi.init();
    wireStartGate();

    // XRExtras dispatches 'xrloaded' when the engine global is ready.
    // If your build exposes readiness differently, adapt here.
    if (window.XRExtras && XRExtras.Loading && XRExtras.Loading.showLoading) {
      XRExtras.Loading.showLoading({ onxrloaded: () => window.dispatchEvent(new Event('xrloaded')) });
    }
  });
})();
