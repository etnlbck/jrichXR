'use client';

import { useEffect, useState } from 'react';
import AdminTooltip from '@/components/AdminTooltip';
import styles from '@/app/admin/admin.module.css';

type TesterRow = {
  id: string;
  email: string;
  createdAt: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  note: string | null;
};

function campaignLabel(row: TesterRow): string {
  const parts = [row.utmSource, row.utmMedium, row.utmCampaign, row.utmContent]
    .filter(Boolean)
    .join(' / ');
  return parts || 'no campaign';
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function AdminTesters() {
  const [testers, setTesters] = useState<TesterRow[] | null>(null);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/testers')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Load failed');
        return data as { testers: TesterRow[]; uniqueCount: number };
      })
      .then((data) => {
        if (cancelled) return;
        setTesters(data.testers);
        setUniqueCount(data.uniqueCount);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Load failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.shell}>
      <h1 className={styles.brand}>
        Testers{' '}
        <AdminTooltip
          about="Testers"
          label="Emails from /test. Campaign shows utm tags; Note is optional feedback from the thank-you page."
        />
      </h1>
      <p className={styles.sub}>
        {testers
          ? `${testers.length} signup${testers.length === 1 ? '' : 's'} · ${uniqueCount} unique email${uniqueCount === 1 ? '' : 's'}`
          : 'Signup emails from /test, with campaign tags and follow-up notes.'}
      </p>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <section className={styles.panel}>
        {testers === null && !error ? (
          <p className={styles.status}>Loading…</p>
        ) : null}
        {testers?.length === 0 ? (
          <p className={styles.status}>No tester signups yet.</p>
        ) : null}
        {testers?.map((row) => (
          <div key={row.id} className={styles.listRow}>
            <div className={styles.userText}>
              <strong>{row.email}</strong>
              <span>{formatWhen(row.createdAt)}</span>
              <span>{campaignLabel(row)}</span>
              {row.note ? <span>{row.note}</span> : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
