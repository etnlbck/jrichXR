'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import type { AppConfig } from '@/lib/config';
import { createScene } from '@/lib/scene';
import { bootXr, loadEngineScripts } from '@/lib/xr-boot';
import type { UiState } from '@/lib/types';
import styles from './ArExperience.module.css';

type Props = {
  appConfig: AppConfig;
  onRequestStart?: () => void;
};

export default function ArExperience({ appConfig, onRequestStart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sceneRef = useRef<ReturnType<typeof createScene> | null>(null);
  const bootedRef = useRef(false);
  const config = appConfig;

  const [state, setState] = useState<UiState>('START');
  const [error, setError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [booting, setBooting] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const narratedOnce = useRef(false);
  const pinAudioRef = useRef<HTMLAudioElement>(null);
  const openPin = config.pins.find((p) => p.id === openPinId);

  const openProvenance = useCallback(() => {
    setShowProvenance(true);
  }, []);

  useEffect(() => {
    sceneRef.current = createScene(config, {
      onState: setState,
      onEnterRaw: () => {
        pinAudioRef.current?.pause();
        if (!config.audio.playOnFirstEnterRaw) {
          openProvenance();
          return;
        }
        const audio = audioRef.current;
        if (!audio) {
          openProvenance();
          return;
        }
        audio.muted = false;
        audio.currentTime = 0;
        void audio.play().catch(() => {
          openProvenance();
        });
        narratedOnce.current = true;
        audio.onended = () => {
          if (narratedOnce.current) openProvenance();
        };
      },
      onEnterFinished: () => {
        const audio = audioRef.current;
        if (audio && !audio.paused) audio.pause();
      },
      onLoadError: (message) => setError(message),
      onModelsReady: () => {
        setModelsReady(true);
        setBooting(false);
      },
    });
  }, [config, openProvenance]);

  useEffect(() => {
    if (state === 'SCANNING' || state === 'START' || state === 'ERROR') {
      setOpenPinId(null);
      pinAudioRef.current?.pause();
    }
  }, [state]);

  const unlockAudio = useCallback(() => {
    if (!config.audio.unlockOnBegin) return;
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
  }, [audioUnlocked, config]);

  const handleBegin = useCallback(async () => {
    if (bootedRef.current || !canvasRef.current || !sceneRef.current) return;
    bootedRef.current = true;
    setBooting(true);
    unlockAudio();
    setState('SCANNING');
    setError(null);
    onRequestStart?.();

    try {
      if (!window.XR8) await loadEngineScripts(config);
      await bootXr({
        canvas: canvasRef.current,
        scene: sceneRef.current,
        config,
        onError: (message) => {
          setError(message);
          setState('ERROR');
          setBooting(false);
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Camera / engine failed to start';
      setError(message);
      setState('ERROR');
      setBooting(false);
    }
  }, [config, onRequestStart, unlockAudio]);

  const handleCanvasTap = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (state !== 'ANCHORED' && state !== 'RAW' && state !== 'FINISHED') return;
      const scene = sceneRef.current;
      const canvas = canvasRef.current;
      if (!scene?.isVisible() || !scene.isModelsReady() || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const pinId = scene.pickPin(ndcX, ndcY);
      if (pinId) {
        const pin = config.pins.find((p) => p.id === pinId);
        setOpenPinId(pinId);
        setShowProvenance(false);
        const pinAudio = pinAudioRef.current;
        const narration = audioRef.current;
        if (narration && !narration.paused) narration.pause();
        if (pinAudio) {
          if (pin?.audioUrl) {
            pinAudio.src = pin.audioUrl;
            pinAudio.currentTime = 0;
            void pinAudio.play().catch(() => {
              /* gesture replay on next tap */
            });
          } else {
            pinAudio.pause();
          }
        }
        return;
      }

      pinAudioRef.current?.pause();
      setOpenPinId(null);
      const next = scene.toggleMorph();
      if (next) setState(next);
    },
    [config.pins, state]
  );

  const pc = config.piece;
  const showScan = state === 'SCANNING' && modelsReady && !booting;
  const showLoading =
    (booting || (state === 'SCANNING' && !modelsReady)) && state !== 'ERROR';
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
            <h1>{pc.gateTitle}</h1>
            <p>Point your phone at the marker beside the sculpture.</p>
            <button type="button" className={styles.beginBtn} onClick={handleBegin}>
              Begin
            </button>
            <small>Camera access is required. Nothing is recorded.</small>
          </div>
        </div>
      )}

      {showLoading && (
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.loadingPulse} />
          <p>Loading experience…</p>
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
            : config.pins.length > 0
              ? 'Tap a pin for a note, or tap the piece to morph'
              : config.assets.interimRaw
              ? 'Tap to preview the morph (interim raw mesh)'
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

      {openPin && (
        <div className={styles.panel}>
          <button
            type="button"
            className={styles.panelClose}
            onClick={() => {
              pinAudioRef.current?.pause();
              setOpenPinId(null);
            }}
            aria-label="Close"
          >
            ×
          </button>
          <h2>{openPin.title}</h2>
          {openPin.body ? <p className={styles.pinBody}>{openPin.body}</p> : null}
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
          <div className={styles.ctaRow}>
            <Link className={styles.cta} href={pc.shopPath}>
              Shop this piece
            </Link>
            {pc.acquireUrl && (
              <a
                className={styles.ctaSecondary}
                href={pc.acquireUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Inquire to acquire
              </a>
            )}
          </div>
        </div>
      )}

      <audio ref={audioRef} preload="auto" playsInline />
      <audio ref={pinAudioRef} preload="auto" playsInline />

      {/* Required attribution for @8thwall/engine-binary */}
      <p className={styles.attrib}>
        XR Engine by Niantic Spatial, Inc. © 2026
      </p>
    </div>
  );
}
