'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/reveal';
import styles from './DensifyPreview.module.css';

type Props = {
  densifyMs: number;
  scatterFactor: number;
  accentFrom: string;
  accentTo: string;
};

const POINT_COUNT = 48;

/** Lightweight Arrive densify mock for Brand Studio (no XR8 / GLB). */
export default function DensifyPreview({
  densifyMs,
  scatterFactor,
  accentFrom,
  accentTo,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [t, setT] = useState(0);
  const playing = useRef(false);
  const raf = useRef(0);
  const start = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const reduced = prefersReducedMotion();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#161412';
    ctx.fillRect(0, 0, w, h);

    const ease = reduced ? t : 1 - Math.pow(1 - t, 3);
    for (let i = 0; i < POINT_COUNT; i++) {
      const a = (i / POINT_COUNT) * Math.PI * 2;
      const targetR = 28 + (i % 7) * 3;
      const scatter = 40 + scatterFactor * 70;
      const r = targetR + (1 - ease) * scatter * (0.4 + (i % 5) * 0.12);
      const x = cx + Math.cos(a + i * 0.2) * r;
      const y = cy + Math.sin(a * 1.1) * r * 0.72;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 5);
      g.addColorStop(0, accentFrom);
      g.addColorStop(1, accentTo);
      ctx.globalAlpha = 0.35 + ease * 0.65;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 2.2 + ease * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [t, scatterFactor, accentFrom, accentTo]);

  function play() {
    if (playing.current) return;
    playing.current = true;
    start.current = performance.now();
    const tick = (now: number) => {
      const dur = Math.max(400, densifyMs);
      const next = Math.min(1, (now - start.current) / dur);
      setT(next);
      if (next < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        playing.current = false;
      }
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div className={styles.root}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={280}
        height={160}
        aria-label="Arrive densify preview"
      />
      <div className={styles.controls}>
        <label className={styles.scrub}>
          Scrub
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={t}
            onChange={(e) => {
              playing.current = false;
              cancelAnimationFrame(raf.current);
              setT(Number(e.target.value));
            }}
          />
        </label>
        <button type="button" className={styles.play} onClick={play}>
          Play
        </button>
      </div>
    </div>
  );
}
