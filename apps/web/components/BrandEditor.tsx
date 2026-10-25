'use client';

import type { ArtistBrand } from '@jrichforms/experience';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import BrandFields from '@/components/BrandFields';
import styles from '@/app/admin/admin.module.css';

type ListedExperience = {
  id: string;
  title: string;
  hasPublished: boolean;
  archived: boolean;
  ownerUserId: string | null;
  brandChanged: boolean;
};

type ArtistOption = { id: string; label: string };

type Props = {
  userId: string;
  isAdmin: boolean;
  currentUserId: string;
};

export default function BrandEditor({ userId, isAdmin, currentUserId }: Props) {
  const router = useRouter();
  const [brand, setBrand] = useState<ArtistBrand | null>(null);
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [blobConfigured, setBlobConfigured] = useState(true);
  const [experiences, setExperiences] = useState<ListedExperience[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [failures, setFailures] = useState<string[]>([]);
  const qs = userId === currentUserId ? '' : `?userId=${encodeURIComponent(userId)}`;

  const loadExperiences = useCallback(async () => {
    const res = await fetch('/api/admin/experiences');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to list experiences');
    setExperiences(data.experiences ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/brand${qs}`).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load brand');
        return data as { brand: ArtistBrand; blobConfigured: boolean };
      }),
      fetch('/api/admin/experiences').then((res) => res.json()),
    ])
      .then(([brandData, list]) => {
        if (cancelled) return;
        setBrand(brandData.brand);
        setSavedJson(JSON.stringify(brandData.brand));
        setBlobConfigured(brandData.blobConfigured);
        setExperiences(list.experiences ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed');
      });
    return () => {
      cancelled = true;
    };
  }, [qs]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch('/api/admin/users')
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((data: { users: { id: string; name: string | null; email: string | null }[] }) => {
        if (cancelled) return;
        setArtists(
          data.users.map((u) => ({ id: u.id, label: u.name || u.email || u.id }))
        );
      })
      .catch(() => {
        /* picker stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const dirty = brand !== null && savedJson !== null && JSON.stringify(brand) !== savedJson;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const owned = useMemo(
    () =>
      experiences.filter(
        (e) => e.ownerUserId === userId && e.hasPublished && !e.archived
      ),
    [experiences, userId]
  );
  const stale = owned.filter((e) => e.brandChanged);

  async function save() {
    if (!brand) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/brand${qs}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setBrand(data.brand);
      setSavedJson(JSON.stringify(data.brand));
      setMessage('Brand saved');
      await loadExperiences();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function republishAll() {
    if (stale.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setFailures([]);
    const failed: string[] = [];
    for (let i = 0; i < stale.length; i++) {
      const exp = stale[i];
      setProgress(`Updating ${i + 1} of ${stale.length}: ${exp.title}`);
      try {
        const res = await fetch(`/api/admin/experiences/${exp.id}/republish-brand`, {
          method: 'POST',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          failed.push(`${exp.title}: ${data.error || res.status}`);
        }
      } catch (err) {
        failed.push(`${exp.title}: ${err instanceof Error ? err.message : 'failed'}`);
      }
    }
    setProgress(null);
    setFailures(failed);
    setMessage(
      failed.length === 0
        ? `Brand applied to ${stale.length} experience${stale.length === 1 ? '' : 's'}`
        : null
    );
    try {
      await loadExperiences();
    } catch {
      /* list refresh is best effort */
    }
    setBusy(false);
  }

  if (!brand) {
    return (
      <div className={styles.shell}>
        <p className={styles.status}>{error || 'Loading…'}</p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.brand}>Brand</h1>
          <p className={styles.sub}>
            How your experiences look to visitors: Begin screen, loading, link
            previews, marker and shop pages.
          </p>
        </div>
      </div>

      {isAdmin && artists.length > 0 && (
        <div className={styles.field} style={{ maxWidth: '22rem' }}>
          <label htmlFor="brand-artist">Editing brand for</label>
          <select
            id="brand-artist"
            value={userId}
            onChange={(e) => {
              if (dirty && !confirm('Discard unsaved brand changes?')) return;
              const next = e.target.value;
              router.push(next === currentUserId ? '/admin/brand' : `/admin/brand?userId=${encodeURIComponent(next)}`);
            }}
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
                {a.id === currentUserId ? ' (you)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {!blobConfigured && (
        <p className={styles.error}>BLOB_READ_WRITE_TOKEN unset — brand changes can’t be saved.</p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <section className={styles.panel}>
        <BrandFields
          value={brand}
          onChange={setBrand}
          uploadUserId={userId}
          disabled={busy || !blobConfigured}
        />
      </section>

      <section className={styles.panel} style={{ marginTop: '2rem' }}>
        <h2 className={styles.sectionTitle}>Published experiences</h2>
        <p className={styles.status}>
          Each published experience keeps the brand it was published with.
          Apply your saved brand to update them; their unpublished draft edits
          stay unpublished.
        </p>
        {owned.length === 0 ? (
          <p className={styles.status}>No published experiences yet.</p>
        ) : (
          owned.map((e) => (
            <div key={e.id} className={styles.listRow}>
              <Link href={`/admin/${e.id}`}>
                <strong>{e.title}</strong>
                <code>{e.id}</code>
              </Link>
              <span>{e.brandChanged ? 'Brand changed' : 'Up to date'}</span>
            </div>
          ))
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            disabled={busy || dirty || stale.length === 0}
            onClick={() => void republishAll()}
            title={dirty ? 'Save the brand first' : undefined}
          >
            Republish all ({stale.length})
          </button>
        </div>
        {progress && <p className={styles.status}>{progress}</p>}
        {failures.length > 0 && (
          <div className={styles.error} role="alert">
            Some experiences weren’t updated:
            <ul>
              {failures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className={styles.actionBar}>
        <span
          className={styles.actionBarStatus}
          data-dirty={dirty}
          role="status"
          aria-live="polite"
        >
          {busy ? 'Working…' : dirty ? 'Unsaved changes' : (message ?? 'All changes saved')}
        </span>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={busy || !dirty || !blobConfigured}
          onClick={() => void save()}
        >
          Save brand
        </button>
      </div>
    </div>
  );
}
