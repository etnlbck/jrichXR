'use client';

import Link from 'next/link';
import QRCode from 'qrcode';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { brandStyle } from '@/lib/brand-style';
import type { AppConfig } from '@/lib/config';
import { setMetricsContext } from '@/lib/metrics';
import { prefersReducedMotion, REVEAL } from '@/lib/reveal';
import { createScene } from '@/lib/scene';
import { buildShareTargets } from '@/lib/share-targets';
import { useCoarsePointer } from '@/lib/use-coarse-pointer';
import { useDialogFocus } from '@/lib/use-dialog-focus';
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

/** YouTube watch / short / embed URL to a privacy-friendly embed URL, else null. */
function youtubeEmbedUrl(href?: string): string | null {
  if (!href) return null;
  try {
    const u = new URL(href);
    let id: string | null = null;
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      id = u.searchParams.get('v');
      const m = u.pathname.match(/^\/(embed|shorts)\/([\w-]+)/);
      if (!id && m) id = m[2];
    }
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  } catch {
    return null;
  }
}

/** Name / email / message form. Submitting opens the visitor's mail app, prefilled. */
function PinContactForm({
  to,
  intro,
  subject,
  onDone,
}: {
  to: string;
  intro: string;
  subject: string;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const address = to.replace(/^mailto:/i, '').split('?')[0];
  const ready = /^[^@\s]+@[^@\s]+$/.test(address);
  return (
    <form
      className={styles.popoverForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        const body = `${message}\n\nFrom: ${name} <${email}>`;
        window.location.href = `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        onDone();
      }}
    >
      {intro ? <p className={styles.pinBody}>{intro}</p> : null}
      <label>
        Name
        <input
          required
          value={name}
          maxLength={120}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          value={email}
          maxLength={200}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Message
        <textarea
          required
          rows={4}
          value={message}
          maxLength={3000}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <button type="submit" className={styles.popoverSubmit} disabled={!ready}>
        Send message
      </button>
      {!ready ? (
        <p className={styles.popoverNote}>
          No receiving address is set for this form yet.
        </p>
      ) : null}
    </form>
  );
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
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [aboutQr, setAboutQr] = useState<string | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [ctaScreen, setCtaScreen] = useState<
    Record<string, { x: number; y: number; visible: boolean }>
  >({});
  const narratedOnce = useRef(false);
  const stingPlayed = useRef(false);
  const pinAudioRef = useRef<HTMLAudioElement>(null);
  const stingAudioRef = useRef<HTMLAudioElement>(null);
  const aboutBtnRef = useRef<HTMLButtonElement>(null);
  const openPin = config.pins.find((p) => p.id === openPinId);
  const [labelsHidden, setLabelsHidden] = useState(false);
  const [peekCtaId, setPeekCtaId] = useState<string | null>(null);
  const [popoverPinId, setPopoverPinId] = useState<string | null>(null);
  const popoverPin = config.pins.find((p) => p.id === popoverPinId);
  const closePopover = useCallback(() => setPopoverPinId(null), []);
  useEffect(() => {
    sceneRef.current?.setLabelsHidden(labelsHidden);
    if (!labelsHidden) setPeekCtaId(null);
  }, [labelsHidden, revealComplete]);
  const { panelRef: popoverPanelRef, closeRef: popoverCloseRef } =
    useDialogFocus(Boolean(popoverPin), closePopover, aboutBtnRef);

  const openProvenance = useCallback(() => {
    setShowProvenance(true);
  }, []);

  const closeSheet = useCallback(() => {
    pinAudioRef.current?.pause();
    setOpenPinId(null);
    setShowProvenance(false);
  }, []);

  const sheetOpen = Boolean(openPin) || showProvenance;
  const { panelRef: sheetPanelRef, closeRef: sheetCloseRef } = useDialogFocus(
    sheetOpen,
    closeSheet,
    aboutBtnRef
  );

  useEffect(() => {
    setMetricsContext({ experienceId: config.experienceId });
  }, [config.experienceId]);

  useEffect(() => {
    if (!revealComplete) {
      setCtaScreen({});
      return;
    }
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const scene = sceneRef.current;
      if (!scene?.isVisible()) return;
      const form: 'finished' | 'raw' =
        state === 'RAW' ? 'raw' : 'finished';
      const updated: Record<string, { x: number; y: number; visible: boolean }> =
        {};
      for (const pin of config.pins) {
        if (pin.style !== 'cta') continue;
        const shows =
          pin.form === 'both' || pin.form === form || pin.form === undefined;
        if (!shows) {
          updated[pin.id] = { x: 0, y: 0, visible: false };
          continue;
        }
        const screen = scene.projectLocal(pin.position);
        if (
          !screen ||
          screen.x < -1.1 ||
          screen.x > 1.1 ||
          screen.y < -1.1 ||
          screen.y > 1.1
        ) {
          updated[pin.id] = { x: 0, y: 0, visible: false };
          continue;
        }
        updated[pin.id] = {
          x: (screen.x * 0.5 + 0.5) * 100,
          y: (-screen.y * 0.5 + 0.5) * 100,
          visible: true,
        };
      }
      setCtaScreen(updated);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [revealComplete, state, config.pins]);

  useEffect(() => {
    if (!showProvenance) {
      setAboutQr(null);
      return;
    }
    let cancelled = false;
    const url = new URL(window.location.href);
    url.searchParams.delete('stage');
    void QRCode.toDataURL(url.toString(), { margin: 1, width: 180 }).then(
      (data) => {
        if (!cancelled) setAboutQr(data);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [showProvenance]);

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
        if (!stingPlayed.current) {
          stingPlayed.current = true;
          const reduced = prefersReducedMotion();
          if (
            config.reveal.haptics &&
            !reduced &&
            typeof navigator !== 'undefined' &&
            typeof navigator.vibrate === 'function'
          ) {
            try {
              navigator.vibrate([12, 40, 12]);
            } catch {
              /* ignore */
            }
          }
          const sting = stingAudioRef.current;
          const narration = audioRef.current;
          if (
            sting &&
            config.reveal.stingUrl &&
            !(narration && !narration.paused)
          ) {
            sting.src = config.reveal.stingUrl;
            sting.currentTime = 0;
            void sting.play().catch(() => {
              /* unlock may be required */
            });
          }
        }
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
          sceneRef.current?.setAudioUnlocked(true);
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

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = config.piece.gateTitle || config.piece.title;
    const name = config.brand.displayName;
    const text = name ? `${title} by ${name}` : title;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setShareStatus(null);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareStatus('Link copied');
      window.setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus(null);
    }
  }, [config.brand.displayName, config.piece.gateTitle, config.piece.title]);

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
      if (scene.pickMediaNode(ndcX, ndcY)) return;
      if (!config.supportsMorph) return;
      const next = scene.toggleMorph();
      if (next) setState(next);
    },
    [config.pins, config.supportsMorph, stage, state, unlockAudio]
  );

  const pc = config.piece;
  const anchored =
    state === 'ANCHORED' || state === 'RAW' || state === 'FINISHED';
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

  const morphHint = !config.supportsMorph
    ? config.pins.length > 0
      ? 'Tap a pin for a note'
      : config.mediaNodes.length > 0
        ? 'Tap the scene to reveal layers'
        : null
    : config.usePlaceholderCube
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
        role="img"
        aria-label={
          revealComplete
            ? config.supportsMorph
              ? `${pc.title}. Tap the piece to morph, or tap a pin for a note.`
              : `${pc.title} augmented reality view`
            : `${pc.title} augmented reality view`
        }
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
          <span className={styles.gateTheme}>
            <ThemeToggle variant="solid" />
          </span>
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
          aria-busy="true"
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
        <div
          className={`${styles.hint} ${fadeClass(scanFade)}`}
          role="status"
          aria-live="polite"
        >
          <div
            className={`${styles.reticle} ${
              reticleSuccess ? styles.reticleSuccess : ''
            }`}
            aria-hidden
          />
          <p>
            {reticleSuccess ? brand.scanFoundText : brand.scanText}
          </p>
        </div>
      )}

      {chromeFade !== 'gone' && (
        <>
          {morphHint ? (
            <div className={`${styles.prompt} ${fadeClass(chromeFade)}`}>
              {morphHint}
            </div>
          ) : null}
          <div className={`${styles.topActions} ${fadeClass(chromeFade)}`}>
            <ThemeToggle variant="solid" />
            <button
              type="button"
              className={styles.shareBtn}
              onClick={() => setLabelsHidden((h) => !h)}
              disabled={chromeFade === 'out'}
              aria-pressed={labelsHidden}
              aria-label={labelsHidden ? 'Show pin labels' : 'Hide pin labels'}
              title={labelsHidden ? 'Show pin labels' : 'Hide pin labels'}
            >
              <i
                className={`bi ${labelsHidden ? 'bi-eye' : 'bi-eye-slash'}`}
                aria-hidden="true"
              />
            </button>
            <div className={styles.shareWrap}>
              <button
                type="button"
                className={styles.shareBtn}
                onClick={() => {
                  if (config.shareTargets.length > 0) {
                    setShareMenuOpen((o) => !o);
                    return;
                  }
                  void handleShare();
                }}
                disabled={chromeFade === 'out'}
                aria-expanded={shareMenuOpen}
                aria-label="Share"
              >
                {shareStatus ?? <i className="bi bi-share" aria-hidden="true" />}
              </button>
              {shareMenuOpen && config.shareTargets.length > 0 ? (
                <div className={styles.shareMenu} role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.shareMenuItem}
                    onClick={() => {
                      setShareMenuOpen(false);
                      void handleShare();
                    }}
                  >
                    System share / copy
                  </button>
                  {buildShareTargets(
                    typeof window !== 'undefined' ? window.location.href : '',
                    config.brand.displayName
                      ? `${config.piece.gateTitle || config.piece.title} by ${config.brand.displayName}`
                      : config.piece.gateTitle || config.piece.title,
                    config.shareTargets
                  ).map((t) => (
                    <a
                      key={t.id}
                      role="menuitem"
                      className={styles.shareMenuItem}
                      href={t.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShareMenuOpen(false)}
                    >
                      {t.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              ref={aboutBtnRef}
              aria-label="About this piece"
              className={styles.about}
              onClick={() => {
                pinAudioRef.current?.pause();
                setOpenPinId(null);
                setShowProvenance(true);
              }}
              disabled={chromeFade === 'out'}
            >
              About
            </button>
          </div>
        </>
      )}

      {issue && <XrIssueSheet issue={issue} />}

      {revealComplete &&
        config.pins
          .filter((p) => p.style === 'cta' && p.href)
          .map((pin) => {
            const screen = ctaScreen[pin.id];
            if (!screen?.visible) return null;
            const label = pin.ctaLabel || pin.title || 'Learn more';
            const pos = { left: `${screen.x}%`, top: `${screen.y}%` };
            if (labelsHidden && peekCtaId !== pin.id) {
              return (
                <button
                  key={pin.id}
                  type="button"
                  className={styles.ghostDot}
                  style={pos}
                  aria-label={`Show ${label}`}
                  onClick={() => setPeekCtaId(pin.id)}
                />
              );
            }
            const embed = pin.action === 'video' ? youtubeEmbedUrl(pin.href) : null;
            const popup =
              (pin.action === 'video' && embed) || pin.action === 'form';
            if (popup) {
              return (
                <button
                  key={pin.id}
                  type="button"
                  className={styles.sceneCta}
                  style={pos}
                  onClick={() => setPopoverPinId(pin.id)}
                >
                  {label}
                </button>
              );
            }
            return (
              <a
                key={pin.id}
                className={styles.sceneCta}
                href={pin.href}
                target="_blank"
                rel="noopener noreferrer"
                style={pos}
              >
                {label}
              </a>
            );
          })}

      {popoverPin && (
        <div className={styles.popoverBackdrop} onClick={closePopover}>
          <div
            className={styles.popover}
            ref={popoverPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-popover-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              ref={popoverCloseRef}
              className={styles.panelClose}
              onClick={closePopover}
              aria-label="Close"
            >
              ×
            </button>
            <h2 id="pin-popover-title">{popoverPin.title}</h2>
            {popoverPin.action === 'video' ? (
              <div className={styles.popoverVideo}>
                <iframe
                  src={youtubeEmbedUrl(popoverPin.href) ?? undefined}
                  title={popoverPin.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            ) : (
              <PinContactForm
                to={popoverPin.href ?? ''}
                intro={popoverPin.body}
                subject={`${config.piece.title} enquiry`}
                onDone={closePopover}
              />
            )}
            {popoverPin.action === 'video' && popoverPin.body ? (
              <p className={styles.pinBody}>{popoverPin.body}</p>
            ) : null}
          </div>
        </div>
      )}

      {openPin && (
        <div
          className={styles.panel}
          ref={sheetPanelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-sheet-title"
          tabIndex={-1}
        >
          <button
            type="button"
            ref={sheetCloseRef}
            className={styles.panelClose}
            onClick={closeSheet}
            aria-label="Close"
          >
            ×
          </button>
          <div className={styles.panelScroll}>
            <h2 id="pin-sheet-title">{openPin.title}</h2>
            {openPin.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- artist pin media
              <img
                className={styles.pinImage}
                src={openPin.imageUrl}
                alt=""
              />
            ) : null}
            {openPin.body ? (
              <p className={styles.pinBody}>{openPin.body}</p>
            ) : null}
            {openPin.href ? (
              <div className={styles.ctaRow}>
                <a
                  className={styles.cta}
                  href={openPin.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {openPin.ctaLabel || 'Learn more'}
                </a>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {showProvenance && (
        <div
          className={styles.panel}
          ref={sheetPanelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="provenance-sheet-title"
          tabIndex={-1}
        >
          <button
            type="button"
            ref={sheetCloseRef}
            className={styles.panelClose}
            onClick={closeSheet}
            aria-label="Close"
          >
            ×
          </button>
          <div className={styles.panelScroll}>
            <h2 id="provenance-sheet-title">{pc.title}</h2>
            {brand.displayName && (
              <p className={styles.brandName}>{brand.displayName}</p>
            )}
            {(pc.material || pc.dimensions || pc.year || pc.exhibition) && (
              <dl>
                {pc.material ? (
                  <>
                    <dt>Material</dt>
                    <dd>{pc.material}</dd>
                  </>
                ) : null}
                {pc.dimensions ? (
                  <>
                    <dt>Dimensions</dt>
                    <dd>{pc.dimensions}</dd>
                  </>
                ) : null}
                {pc.year ? (
                  <>
                    <dt>Year</dt>
                    <dd>{pc.year}</dd>
                  </>
                ) : null}
                {pc.exhibition ? (
                  <>
                    <dt>Exhibition</dt>
                    <dd>{pc.exhibition}</dd>
                  </>
                ) : null}
              </dl>
            )}
            {(pc.shopPath || pc.acquireUrl) && (
              <div className={styles.ctaRow}>
                {pc.shopPath ? (
                  <Link className={styles.cta} href={pc.shopPath}>
                    {config.kind === 'experience' ? 'Visit shop' : 'Shop this piece'}
                  </Link>
                ) : null}
                {pc.acquireUrl ? (
                  <a
                    className={styles.ctaSecondary}
                    href={pc.acquireUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Inquire to acquire
                  </a>
                ) : null}
              </div>
            )}
            <div className={styles.aboutQr}>
              <p className={styles.aboutQrLabel}>Open on another phone</p>
              {aboutQr ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL
                <img
                  src={aboutQr}
                  alt="QR code to open this experience on a phone"
                  width={180}
                  height={180}
                />
              ) : (
                <p className={styles.aboutQrLabel}>Preparing QR…</p>
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
      <audio ref={stingAudioRef} preload="auto" playsInline />

      {!stage && (
        <p className={styles.attrib}>
          XR Engine by Niantic Spatial, Inc. © 2026
        </p>
      )}
    </div>
  );
}
