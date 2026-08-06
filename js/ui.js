/*
 * ui.js — screen state machine, narration, provenance card, tap handling.
 *
 * States: START → SCANNING → ANCHORED → (tap) RAW/FINISHED
 * Narration and provenance are sequenced off the RAW transition.
 */
window.JRFUi = (function () {
  'use strict';

  const cfg = window.JRF_CONFIG;
  let state = 'START';
  let narration = null;
  let audioUnlocked = false;
  let narratedOnce = false;

  const els = {};

  function init() {
    els.scanHint = document.getElementById('scan-hint');
    els.tapPrompt = document.getElementById('tap-prompt');
    els.provenance = document.getElementById('provenance');
    els.provTitle = document.getElementById('prov-title');
    els.provFields = document.getElementById('prov-fields');
    els.provAcquire = document.getElementById('prov-acquire');
    els.provClose = document.getElementById('prov-close');
    narration = document.getElementById('narration');
    narration.src = cfg.assets.narration;

    // Tap anywhere on the camera canvas toggles the morph — but only when a
    // model is anchored. This tap doubles as the iOS gesture that lets audio play.
    document.getElementById('camerafeed').addEventListener('click', onCanvasTap);
    els.provClose.addEventListener('click', () => els.provenance.classList.add('hidden'));

    populateProvenance();
  }

  // Play + immediately pause muted inside the start gesture to satisfy iOS.
  function unlockAudio() {
    if (audioUnlocked || !narration) return;
    narration.muted = true;
    const p = narration.play();
    if (p && p.then) {
      p.then(() => { narration.pause(); narration.currentTime = 0; narration.muted = false; audioUnlocked = true; })
       .catch(() => { /* will retry on the morph tap */ });
    }
  }

  function onCanvasTap() {
    if (state !== 'ANCHORED' && state !== 'RAW' && state !== 'FINISHED') return;
    if (!window.JRFScene.isVisible()) return;
    const next = window.JRFScene.toggleMorph();
    setState(next);
  }

  function onEnterRaw() {
    playNarration();
  }

  function onEnterFinished() {
    // Optional: pause narration when returning to finished.
  }

  function playNarration() {
    if (!narration) return;
    narration.muted = false;
    narration.currentTime = 0;
    const p = narration.play();
    if (p && p.catch) p.catch(() => {});
    narratedOnce = true;

    // Reveal provenance when narration ends (once).
    narration.onended = () => {
      if (narratedOnce) els.provenance.classList.remove('hidden');
    };
  }

  function populateProvenance() {
    const pc = cfg.piece;
    els.provTitle.textContent = pc.title;
    const rows = [
      ['Material', pc.material],
      ['Dimensions', pc.dimensions],
      ['Year', pc.year],
      ['Exhibition', pc.exhibition],
    ];
    els.provFields.innerHTML = rows
      .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
      .join('');
    els.provAcquire.href = pc.acquireUrl;
  }

  function setState(next) {
    state = next;
    // Reset all transient UI, then show what this state needs.
    els.scanHint.classList.add('hidden');
    els.tapPrompt.classList.add('hidden');

    switch (next) {
      case 'SCANNING':
        els.scanHint.classList.remove('hidden');
        break;
      case 'ANCHORED':
      case 'FINISHED':
        els.tapPrompt.classList.remove('hidden');
        break;
      case 'RAW':
        // narration + (eventually) provenance drive this state
        break;
    }
  }

  return { init, setState, unlockAudio, onEnterRaw, onEnterFinished };
})();
