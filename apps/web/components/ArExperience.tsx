'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { brandStyle } from '@/lib/brand-style';
import type { AppConfig } from '@/lib/config';
import { REVEAL } from '@/lib/reveal';
import { createScene } from '@/lib/scene';
import { useCoarsePointer } from '@/lib/use-coarse-pointer';
import {
  bootXr,
  requestMotionPermission,
  type CameraStatus,
  type XrIssue,
} from '@/lib/xr-boot';
import type { UiState } from '@/lib/types';
import DesktopGate from './DesktopGate';
import XrIssueSheet from './XrIssueSheet';
import styles from './ArExperience.module.css';

type Props = {
  appConfig: AppConfig;
  onRequestStart?: () => void;
  /** Desktop stand-in: model, pins, and sheets without the camera. */
  stage?: boolean;
};

type FadePhase = 'in' | 'out' | 'gone';

function useFadeMount(active: boolean, durationMs: number) {
  const [phase, setPhase] = useState<FadePhase>(active ? 'in' : 'gone');
  const wasActive = useRef(active);

  useEffect(() => {
    if (active) {
      wasActive.current = true;
      setPhase('in');
      return;
    }
    if (!wasActive.current || phase === 'gone') {
      setPhase('gone');
      return;
    }
    setPhase('out');
    const t = window.setTimeout(() => {
      wasActive.current = false;
      setPhase('gone');
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [active, durationMs]); // eslint-disable-line react-hooks/exhaustive-deps -- phase intentionally omitted

  return phase;
}

export default function ArExperience({
  appConfig,
  onRequestStart,
  stage = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sceneRef = useRef<ReturnType<typeof createScene> | null>(null);
  const bootedRef = useRef(false);
  const config = appConfig;

  const [state, setState] = useState<UiState>('START');
  const [issue, setIssue] = useState<XrIssue | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const coarsePointer = useCoarsePointer();
  const [useCameraAnyway, setUseCameraAnyway] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [booting, setBooting] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const [revealComplete, setRevealComplete] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [reticleSuccess, setReticleSuccess] = useState(false);
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
      onLoadError: (message) => {
        console.error('[jrf] model load failed:', message);
        setIssue('generic');
      },
      onModelsReady: () => {
        setModelsReady(true);
        setBooting(false);
        if (stage) setState('ANCHORED');
      },
      onRevealStart: () => {
        setRevealing(true);
        if (!stage) {
          setReticleSuccess(true);
          window.setTimeout(
            () => setReticleSuccess(false),
            REVEAL.reticleSuccessMs
          );
        }
      },
      onRevealComplete: () => {
        setRevealing(false);
        setRevealComplete(true);
        setReticleSuccess(false);
      },
    });
  }, [config, openProvenance, stage]);

  useEffect(() => {
    if (state === 'SCANNING' || state === 'START' || state === 'ERROR') {
      setOpenPinId(null);
      pinAudioRef.current?.pause();
      if (state === 'SCANNING' && !stage) {
        setRevealing(false);
        // Allow densify retry after tracking loss mid-reveal; keep done if finished.
        if (!sceneRef.current?.isRevealComplete()) {
          setRevealComplete(false);
        }
      }
    }
  }, [state, stage]);

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
    const motion = requestMotionPermission();
    bootedRef.current = true;
    setBooting(true);
    unlockAudio();
    setState('SCANNING');
    setIssue(null);
    onRequestStart?.();

    await bootXr({
      canvas: canvasRef.current,
      scene: sceneRef.current,
      config,
      motion,
      onStatus: setCameraStatus,
      onError: (next) => {
        setIssue(next);
        setState('ERROR');
        setBooting(false);
      },
    });
  }, [config, onRequestStart, unlockAudio]);

  useEffect(() => {
    if (!stage || !canvasRef.current || !sceneRef.current) return;
    setBooting(true);
    setIssue(null);
    const stop = sceneRef.current.startStage(canvasRef.current);
    return stop;
  }, [stage]);

  const handleCanvasTap = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (state !== 'ANCHORED' && state !== 'RAW' && state !== 'FINISHED') return;
      const scene = sceneRef.current;
      const canvas = canvasRef.current;
      if (!scene?.isVisible() || !scene.isModelsReady() || !canvas) return;
      if (!scene.isRevealComplete()) return;
      if (stage) unlockAudio();

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
    [config.pins, stage, state, unlockAudio]
  );

  const pc = config.piece;
  const anchored =
    state === 'ANCHORED' || state === 'RAW' || state === 'FINISHED';
  const sheetOpen = Boolean(openPin) || showProvenance;
  const showScan =
    !stage &&
    state === 'SCANNING' &&
    modelsReady &&
    !booting &&
    !revealing;
  const askingCamera =
    !stage && state === 'SCANNING' && cameraStatus === 'requesting';
  const showLoading =
    (askingCamera || booting || (state === 'SCANNING' && !modelsReady)) &&
    state !== 'ERROR';
  const showDesktopGate =
    !stage && state === 'START' && coarsePointer === false && !useCameraAnyway;
  const showBeginGate =
    !stage && state === 'START' && coarsePointer !== null && !showDesktopGate;
  const showChrome = anchored && modelsReady && revealComplete && !sheetOpen;
  const showTap = showChrome;

  const gateFade = useFadeMount(showBeginGate, REVEAL.gateFadeMs);
  const loadingFade = useFadeMount(showLoading, REVEAL.overlayFadeMs);
  const scanFade = useFadeMount(
    showScan || reticleSuccess,
    REVEAL.overlayFadeMs
  );
  const chromeFade = useFadeMount(showChrome, REVEAL.overlayFadeMs);

  const morphHint = config.usePlaceholderCube
    ? 'Tap the cube to preview the morph'
    : config.pins.length > 0
      ? state === 'RAW'
        ? 'Tap a pin for a note, or tap the piece to return'
        : 'Tap a pin for a note, or tap the piece to morph'
      : state === 'RAW'
        ? 'Tap the piece to return to the finished form'
        : 'Tap the piece to reveal the raw form';

  const brand = config.brand;
  const logo = brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- artist upload on Blob, any size
    <img className={styles.brandLogo} src={brand.logoUrl} alt={brand.displayName ?? ''} />
  ) : null;

  const fadeClass = (phase: FadePhase) =>
    phase === 'out' ? styles.fadeOut : styles.fadeIn;

  return (
    <div
      className={styles.root}
      style={
        {
          ...brandStyle(brand),
          ['--reveal-fade-ms' as string]: `${REVEAL.overlayFadeMs}ms`,
          ['--gate-fade-ms' as string]: `${REVEAL.gateFadeMs}ms`,
          ['--reticle-success-ms' as string]: `${REVEAL.reticleSuccessMs}ms`,
        } as CSSProperties
      }
    >
      <canvas
        id="camerafeed"
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleCanvasTap}
      />

      {showDesktopGate && (
        <DesktopGate
          title={pc.gateTitle}
          logo={logo}
          artistName={brand.displayName}
          onUseCamera={() => setUseCameraAnyway(true)}
        />
      )}

      {gateFade !== 'gone' && (
        <div className={`${styles.overlay} ${fadeClass(gateFade)}`}>
          <div className={styles.gateCard}>
            {logo}
            {brand.displayName && (
              <p className={styles.brandName}>{brand.displayName}</p>
            )}
            <h1>{pc.gateTitle}</h1>
            <p>{brand.beginText}</p>
            <button
              type="button"
              className={styles.beginBtn}
              onClick={handleBegin}
              disabled={gateFade === 'out'}
            >
              {brand.beginLabel}
            </button>
            <small>Camera access is required. Nothing is recorded.</small>
          </div>
        </div>
      )}

      {loadingFade !== 'gone' && (
        <div
          className={`${styles.loading} ${fadeClass(loadingFade)}`}
          role="status"
          aria-live="polite"
        >
          {logo}
          <div className={styles.loadingPulse} />
          <p>
            {askingCamera
              ? 'Allow camera access when your browser asks'
              : brand.loadingText}
          </p>
        </div>
      )}

      {scanFade !== 'gone' && (
        <div className={`${styles.hint} ${fadeClass(scanFade)}`}>
          <div
            className={`${styles.reticle} ${
              reticleSuccess ? styles.reticleSuccess : ''
            }`}
          />
          <p>{reticleSuccess ? 'Found' : 'Aim at the marker…'}</p>
        </div>
      )}

      {chromeFade !== 'gone' && (
        <>
          <div className={`${styles.prompt} ${fadeClass(chromeFade)}`}>
            {morphHint}
          </div>
          <button
            type="button"
            className={`${styles.about} ${fadeClass(chromeFade)}`}
            onClick={() => {
              pinAudioRef.current?.pause();
              setOpenPinId(null);
              setShowProvenance(true);
            }}
            disabled={chromeFade === 'out'}
          >
            About this piece
          </button>
        </>
      )}

      {issue && <XrIssueSheet issue={issue} />}

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
          <div className={styles.panelScroll}>
            <h2>{openPin.title}</h2>
            {openPin.body ? (
              <p className={styles.pinBody}>{openPin.body}</p>
            ) : null}
          </div>
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
          <div className={styles.panelScroll}>
            <h2>{pc.title}</h2>
            {brand.displayName && (
              <p className={styles.brandName}>{brand.displayName}</p>
            )}
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
            <p className={styles.credit}>
              AR engine by Niantic Spatial ·{' '}
              <Link href="/licenses">Licenses</Link>
            </p>
          </div>
        </div>
      )}

      <audio ref={audioRef} preload="auto" playsInline />
      <audio ref={pinAudioRef} preload="auto" playsInline />

      {!stage && (
        <p className={styles.attrib}>
          XR Engine by Niantic Spatial, Inc. © 2026
        </p>
      )}
    </div>
  );
}
