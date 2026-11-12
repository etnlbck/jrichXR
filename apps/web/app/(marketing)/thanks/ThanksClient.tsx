'use client';

import QRCode from 'qrcode';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import styles from '../marketing.module.css';

type Props = {
  testerId: string | null;
  emailed: boolean;
  tryUrl: string;
};

export default function ThanksClient({ testerId, emailed, tryUrl }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteOk, setNoteOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(tryUrl, { margin: 1, width: 240 })
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tryUrl]);

  async function onNoteSubmit(event: FormEvent) {
    event.preventDefault();
    if (!testerId) return;
    setBusy(true);
    setNoteError(null);
    setNoteOk(false);
    try {
      const res = await fetch('/api/testers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: testerId, note }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.status === 429) {
        setNoteError('Please wait a minute before sending another note.');
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setNoteError(
          data.error === 'not_found'
            ? 'That signup link is no longer valid.'
            : 'Could not save your note. Try again.'
        );
        setBusy(false);
        return;
      }
      setNoteOk(true);
      setNote('');
      setBusy(false);
    } catch {
      setNoteError('Could not save your note. Try again.');
      setBusy(false);
    }
  }

  return (
    <>
      {!emailed ? (
        <p className={styles.warn} role="status">
          Your email was saved, but the confirmation message did not send. Use
          the steps below, or reply later once mail is working.
        </p>
      ) : null}

      <div className={`${styles.stack} ${styles.stackPhone}`}>
        <Link href="/try" className={styles.primary}>
          Start the test
        </Link>
        <p className={styles.hint}>
          Prefer to print first? Open{' '}
          <Link href="/marker" className={styles.quiet}>
            /marker
          </Link>{' '}
          from a laptop, then come back here. The same links are in your email
          when delivery succeeds.
        </p>
      </div>

      <div className={`${styles.stack} ${styles.stackDesk}`}>
        <div className={styles.secondaryRow}>
          <Link href="/marker" className={styles.primary}>
            Print the marker
          </Link>
          <Link href="/try?stage=1" className={styles.quiet}>
            Preview without a camera
          </Link>
        </div>
        <div className={styles.qrWrap}>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.qr}
              src={qr}
              alt="QR code to open /try on a phone"
            />
          ) : (
            <p className={styles.hint}>
              On your phone, open <Link href="/try">{tryUrl}</Link>
            </p>
          )}
          <p className={styles.hint}>
            Scan this QR on your phone to open the experience, then aim at the
            printed marker.
          </p>
        </div>
      </div>

      {testerId ? (
        <div className={styles.card}>
          <p>
            <strong>What happened?</strong> After you try the piece, leave a
            short note: camera, marker tracking, morph, or anything else.
          </p>
          <form className={styles.form} onSubmit={onNoteSubmit}>
            <label className={styles.label}>
              Note
              <textarea
                className={styles.textarea}
                name="note"
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
              />
            </label>
            {noteError ? <p className={styles.error}>{noteError}</p> : null}
            {noteOk ? <p className={styles.ok}>Thanks. Note saved.</p> : null}
            <button
              type="submit"
              className={styles.primary}
              disabled={busy || note.trim().length === 0}
            >
              {busy ? 'Sending…' : 'Send note'}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
