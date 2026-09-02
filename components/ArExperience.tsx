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

type OverlayTab = 'process' | 'artist' | 'contact';

export default function ArExperience({ onRequestStart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sceneRef = useRef<ReturnType<typeof createScene> | null>(null);
  const bootedRef = useRef(false);

  const [state, setState] = useState<UiState>('START');
  const [error, setError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<OverlayTab | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    sceneRef.current = createScene({
      onState: setState,
      onEnterRaw: () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = false;
        audio.currentTime = 0;
        void audio.play().catch(() => {});
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

  const handlePreviewDemo = useCallback(() => {
    // Bypasses camera + marker recognition entirely so the CTA/overlay UI
    // can be tested before a real trained marker and 3D assets exist.
    setIsPreview(true);
    setModelsReady(true);
    setState('ANCHORED');
  }, []);

  const handleCanvasTap = useCallback(() => {
    if (activeOverlay) return; // don't morph while an overlay is open
    if (state !== 'ANCHORED' && state !== 'RAW' && state !== 'FINISHED') return;
    const scene = sceneRef.current;
    if (!scene?.isVisible() || !scene.isModelsReady()) return;
    const next = scene.toggleMorph();
    if (next) setState(next);
  }, [state, activeOverlay]);

  const pc = config.piece;

  // The four CTAs show as soon as the piece is anchored — independent of the
  // optional tap-to-morph/narration interaction, which still works on its own.
  const showScan = state === 'SCANNING';
  const showCTAs =
    (state === 'ANCHORED' || state === 'RAW' || state === 'FINISHED') && modelsReady;

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
            <button type="button" className={styles.previewBtn} onClick={handlePreviewDemo}>
              Preview UI (skip camera)
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

      {showCTAs && !activeOverlay && (
        <>
          {isPreview ? (
            <div className={styles.previewOuter}>
              <div className={styles.previewStage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.previewImage} alt={pc.title} className={styles.previewImg} />
                <button className={`${styles.ctaPillScatter} ${styles.ctaTopLeft}`} onClick={() => setActiveOverlay('process')}>
                  Behind the Carving
                </button>
                <button className={`${styles.ctaPillScatter} ${styles.ctaMidRight}`} onClick={() => setActiveOverlay('artist')}>
                  Artist Profile
                </button>
                <a href={config.storeUrl} target="_blank" rel="noopener noreferrer" className={`${styles.ctaPillScatter} ${styles.ctaBottomLeft}`}>
                  Store
                </a>
                <button className={`${styles.ctaPillScatter} ${styles.ctaBottomRight}`} onClick={() => setActiveOverlay('contact')}>
                  Let&apos;s Connect
                </button>
              </div>
              <div className={styles.previewCaptionBelow}>
                <div className={styles.previewTitle}>{pc.title}</div>
                <div className={styles.previewArtist}>Artist: {config.artist.name}</div>
              </div>
            </div>
          ) : (
            <div className={styles.ctaLayer}>
              <div className={styles.pieceLabel}>{pc.title}</div>
              <div className={styles.ctaRow}>
                <button className={styles.ctaPill} onClick={() => setActiveOverlay('process')}>
                  Behind the Carving
                </button>
                <button className={styles.ctaPill} onClick={() => setActiveOverlay('artist')}>
                  Artist Profile
                </button>
              </div>
              <div className={styles.ctaRow}>
                <a href={config.storeUrl} target="_blank" rel="noopener noreferrer" className={styles.ctaPill}>
                  Store
                </a>
                <button className={styles.ctaPill} onClick={() => setActiveOverlay('contact')}>
                  Let&apos;s Connect
                </button>
              </div>
            </div>
          )}
        </>
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

      {activeOverlay && (
        <FullOverlay tab={activeOverlay} onClose={() => setActiveOverlay(null)} />
      )}

      <audio ref={audioRef} preload="auto" playsInline />

      {/* Required attribution for @8thwall/engine-binary */}
      <p className={styles.attrib}>
        XR Engine by Niantic Spatial, Inc. © 2026
      </p>
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const pc = config.piece;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Inquiry about ${pc.title}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${config.artist.contactEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <div>
      <p className={styles.connectLabel}>Connect on Social Media</p>
      <div className={styles.socialRow}>
        <a href={config.artist.instagramUrl} className={styles.socialCircle} aria-label="Instagram">
          <i className="bi bi-instagram" style={{ color: '#fff', fontSize: 16 }} />
        </a>
        <a href="#" className={styles.socialCircle} aria-label="LinkedIn">
          <i className="bi bi-linkedin" style={{ color: '#fff', fontSize: 16 }} />
        </a>
        <a href="#" className={styles.socialCircle} aria-label="Facebook">
          <i className="bi bi-facebook" style={{ color: '#fff', fontSize: 16 }} />
        </a>
      </div>

      <form onSubmit={handleSubmit}>
        <label className={styles.formLabel} htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          className={styles.formInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className={styles.formLabel} htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          type="email"
          className={styles.formInput}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className={styles.formLabel} htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          className={styles.formTextarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className={styles.submitBtn}>SUBMIT</button>
      </form>
    </div>
  );
}

function FullOverlay({ tab, onClose }: { tab: OverlayTab; onClose: () => void }) {
  const [current, setCurrent] = useState<OverlayTab>(tab);
  const headerTitle =
    current === 'process' ? 'Behind the Carving' : current === 'artist' ? 'Artist Profile' : 'Contact';

  return (
    <div className={styles.fullOverlay}>
      <div className={styles.overlayHeader}>
        <div className={styles.overlayHeaderTitle}>{headerTitle}</div>
        <button onClick={onClose} aria-label="Close" className={styles.overlayCloseBtn}>
          ×
        </button>
      </div>

      <div className={styles.overlayBody}>
        {current === 'process' && (
          <div>
            <div className={styles.videoEmbed}>
              <iframe
                src={config.processVideoUrl}
                title="Behind the Carving"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className={styles.overlayCaption}>{config.video.caption}</p>
          </div>
        )}

        {current === 'artist' && (
          <div style={{ textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={config.artist.avatar} alt={config.artist.name} className={styles.avatarLarge} />
            <h3 className={styles.artistName}>{config.artist.name}</h3>
            <p className={styles.overlayCaption}>{config.artist.bio}</p>
            <div className={styles.tagsRow}>
              {config.artist.tags.map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {current === 'contact' && <ContactForm />}
      </div>

      <nav className={styles.overlayTabbar}>
        <button
          className={styles.overlayTabBtn}
          data-active={current === 'process'}
          onClick={() => setCurrent('process')}
        >
          Process
        </button>
        <button
          className={styles.overlayTabBtn}
          data-active={current === 'artist'}
          onClick={() => setCurrent('artist')}
        >
          Artist
        </button>
        <a href={config.storeUrl} target="_blank" rel="noopener noreferrer" className={styles.overlayTabBtn}>
          Shop
        </a>
        <button
          className={styles.overlayTabBtn}
          data-active={current === 'contact'}
          onClick={() => setCurrent('contact')}
        >
          Contact
        </button>
      </nav>
    </div>
  );
}
