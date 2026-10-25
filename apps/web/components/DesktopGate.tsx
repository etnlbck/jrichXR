'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import styles from './ArExperience.module.css';

type Props = {
  title: string;
  /** Fall through to the phone flow, for tablets that report a fine pointer. */
  onUseCamera: () => void;
};

/** Desktop visitors: scan to open on a phone, or look around the piece in 3D. */
export default function DesktopGate({ title, onUseCamera }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [stageHref, setStageHref] = useState('?stage=1');

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('stage');
    const stage = new URL(url);
    stage.searchParams.set('stage', '1');
    let cancelled = false;
    void QRCode.toDataURL(url.toString(), { margin: 1, width: 220 }).then((data) => {
      if (cancelled) return;
      setQr(data);
      setStageHref(stage.pathname + stage.search);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.gateCard}>
        <h1>{title}</h1>
        <p>Scan with your phone to see it in AR, beside the sculpture.</p>
        <div className={styles.desktopQr}>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL
            <img src={qr} alt="QR code to open this page on a phone" width={220} height={220} />
          ) : null}
        </div>
        <a className={styles.beginBtn} href={stageHref}>
          View in 3D
        </a>
        <button type="button" className={styles.textLink} onClick={onUseCamera}>
          Use this device&apos;s camera
        </button>
      </div>
    </div>
  );
}
