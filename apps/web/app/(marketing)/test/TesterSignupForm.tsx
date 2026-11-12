'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import styles from '../marketing.module.css';

type Props = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

const ERRORS: Record<string, string> = {
  invalid_email: 'Enter a valid email address.',
  rate_limited: 'Please wait a minute before trying again.',
  storage_unavailable: 'Signups are temporarily unavailable. Try again later.',
  storage_failed: 'Could not save your email. Try again later.',
};

export default function TesterSignupForm({
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const company = String(form.get('company') ?? '').trim();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/testers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        id?: string;
        emailed?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(ERRORS[data.error ?? ''] ?? 'Something went wrong. Try again.');
        setBusy(false);
        return;
      }
      const params = new URLSearchParams();
      if (data.id) params.set('id', data.id);
      if (data.emailed === false) params.set('emailed', '0');
      router.push(`/thanks?${params.toString()}`);
    } catch {
      setError('Something went wrong. Try again.');
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <label className={styles.label}>
        Email
        <input
          className={styles.input}
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
          disabled={busy}
        />
      </label>
      <label className={styles.hp} aria-hidden="true">
        Company
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button type="submit" className={styles.primary} disabled={busy}>
        {busy ? 'Joining…' : 'Get the test links'}
      </button>
      <p className={styles.hint}>
        We will email the marker and experience links. Camera access is only
        requested when you open the experience — nothing is recorded.
      </p>
    </form>
  );
}
