'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import styles from '@/app/admin/admin.module.css';

type Handoff = {
  url: string;
  qr: string;
  expiresAt: number;
  localOnly: boolean;
};

function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** QR code that signs the artist in on their phone and opens the AR placer. */
export default function PhoneHandoff({ experienceId }: { experienceId: string }) {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!handoff) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [handoff]);

  const expired = handoff !== null && now >= handoff.expiresAt;

  async function create() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(
        `/api/admin/handoff?id=${encodeURIComponent(experienceId)}`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Could not create link');
      const qr = await QRCode.toDataURL(data.url, { margin: 1, width: 240 });
      setHandoff({ url: data.url, qr, expiresAt: data.expiresAt, localOnly: data.localOnly });
      setNow(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create link');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!handoff) return;
    try {
      await navigator.clipboard.writeText(handoff.url);
      setCopied(true);
    } catch {
      setError('Copy failed. Long-press the QR code instead.');
    }
  }

  return (
    <div className={styles.handoff}>
      {handoff && !expired ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL
        <img
          className={styles.handoffQr}
          src={handoff.qr}
          alt="QR code that opens AR pin placement on your phone"
          width={160}
          height={160}
        />
      ) : null}
      <div className={styles.handoffText}>
        <strong>Place pins from your phone</strong>
        {!handoff || expired ? (
          <>
            <span>
              Scan a QR code with your phone camera to sign in there and open AR
              placement. Or sign in on your phone and use Place in AR.
            </span>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btn}
                disabled={busy}
                onClick={() => void create()}
              >
                {expired ? 'New QR code' : 'Show QR code'}
              </button>
            </div>
            {expired && <span>That code expired. Make a new one.</span>}
          </>
        ) : (
          <>
            <span>
              Scan with your phone camera. Expires in{' '}
              {formatRemaining(handoff.expiresAt - now)} and works once.
            </span>
            <span>
              This code signs in as you. Don&apos;t share it or show it on a
              screen share.
            </span>
            {handoff.localOnly && (
              <span className={styles.error}>
                This link points at localhost, which your phone can&apos;t reach.
                Open the studio from your network address or a deployment.
              </span>
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.btn} onClick={() => void copy()}>
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button type="button" className={styles.btn} onClick={() => setHandoff(null)}>
                Hide
              </button>
            </div>
          </>
        )}
        {error && (
          <span className={styles.error} role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
