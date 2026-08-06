'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { config } from '@/lib/config';
import { createScene } from '@/lib/scene';
import { bootXr, loadEngineScripts } from '@/lib/xr-boot';
import type { UiState } from '@/lib/types';
import styles from './ArExperience.module.css';

type Props = {
  onRequestStart?: () => void;
};

export default function ArExperience({ onRequestStart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sceneRef = useRef<ReturnType<typeof createScene> | null>(null);
  const bootedRef = useRef(false);

  const [state, setState] = useState<UiState>('START');
  const [error, setError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const narratedOnce = useRef(false);

  useEffect(() => {
    sceneRef.current = createScene({
      onState: setState,
      onEnterRaw: () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = false;
        audio.currentTime = 0;
        void audio.play().catch(() => {});
        narratedOnce.current = true;
        audio.onended = () => {
          if (narratedOnce.current) setShowProvenance(true);
        };
      },
      onEnterFinished: () => {
        const audio = audioRef.current;
        if (audio && !audio.paused) audio.pause();
      },
      onLoadError: (message) => setError(message),
      onModelsReady: () => setModelsReady(true),
    });
  }, []);

  const unlockAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioUnlocked) return;
    audio.src = config.assets.narration;
    audio.muted = true;
    const p = audio.play();
    if (p?.then) {
      void p
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          setAudioUnlocked(true);
        })
        .catch(() => {
          /* retry on morph tap */
        });
    }
  }, [audioUnlocked]);

  const handleBegin = useCallback(async () => {
    if (bootedRef.current || !canvasRef.current || !sceneRef.current) return;
    bootedRef.current = true;
    unlockAudio();
    setState('SCANNING');
    setError(null);
    onRequestStart?.();

    try {
      if (!window.XR8) await loadEngineScripts();
      await bootXr({
        canvas: canvasRef.current,
        scene: sceneRef.current,
        onError: (message) => {
          setError(message);
          setState('ERROR');
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Camera / engine failed to start';
      setError(message);
      setState('ERROR');
    }
  }, [onRequestStart, unlockAudio]);

  const handleCanvasTap = useCallback(() => {
    if (state !== 'ANCHORED' && state !== 'RAW' && state !== 'FINISHED') return;
    const scene = sceneRef.current;
    if (!scene?.isVisible() || !scene.isModelsReady()) return;
    const next = scene.toggleMorph();
    if (next) setState(next);
  }, [state]);

  const pc = config.piece;
  const showScan = state === 'SCANNING';
  const showTap =
    (state === 'ANCHORED' || state === 'FINISHED') && modelsReady;

  return (
    <div className={styles.root}>
      <canvas
        id="camerafeed"
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleCanvasTap}
      />

      {state === 'START' && (
        <div className={styles.overlay}>
          <div className={styles.gateCard}>
            <h1>The Stone Speaks Spatially</h1>
            <p>Point your phone at the marker beside the sculpture.</p>
            <button type="button" className={styles.beginBtn} onClick={handleBegin}>
              Begin
            </button>
            <small>Camera access is required. Nothing is recorded.</small>
          </div>
        </div>
      )}

      {showScan && (
        <div className={styles.hint}>
          <div className={styles.reticle} />
          <p>Aim at the marker…</p>
        </div>
      )}

      {showTap && (
        <div className={styles.prompt}>
          {config.usePlaceholderCube
            ? 'Tap the cube to preview the morph'
            : 'Tap the piece to reveal the raw stone'}
        </div>
      )}

      {error && (
        <div className={styles.errorBanner} role="alert">
          <strong>Something went wrong</strong>
          <p>{error}</p>
          <p className={styles.errorHint}>
            Check camera permission, HTTPS, and that the marker JSON exists at{' '}
            {config.imageTargetJson}.
          </p>
        </div>
      )}

      {showProvenance && (
        <div className={styles.panel}>
          <button
            type="button"
            className={styles.panelClose}
            onClick={() => setShowProvenance(false)}
            aria-label="Close"
          >
            ×
          </button>
          <h2>{pc.title}</h2>
          <dl>
            <dt>Material</dt>
            <dd>{pc.material}</dd>
            <dt>Dimensions</dt>
            <dd>{pc.dimensions}</dd>
            <dt>Year</dt>
            <dd>{pc.year}</dd>
            <dt>Exhibition</dt>
            <dd>{pc.exhibition}</dd>
          </dl>
          <a
            className={styles.cta}
            href={pc.acquireUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Inquire to acquire
          </a>
        </div>
      )}

      <audio ref={audioRef} preload="auto" playsInline />

      {/* Required attribution for @8thwall/engine-binary */}
      <p className={styles.attrib}>
        XR Engine by Niantic Spatial, Inc. © 2026
      </p>
    </div>
  );
}
