'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import styles from '@/app/admin/admin.module.css';

type ExperienceIndexItem = {
  id: string;
  title: string;
  blobConfigured: boolean;
  hasDraft: boolean;
  hasPublished: boolean;
  draftVersion: string | null;
  publishedVersion: string | null;
};

export default function AdminList() {
  const router = useRouter();
  const [items, setItems] = useState<ExperienceIndexItem[]>([]);
  const [blobConfigured, setBlobConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [id, setId] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/experiences')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to list experiences');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setBlobConfigured(data.blobConfigured === true);
        setItems(data.experiences ?? []);
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error === 'experience_exists'
            ? 'That slug already exists'
            : data.error === 'invalid_experience_id'
              ? 'Slug must be lowercase letters, numbers, and hyphens'
              : data.error || 'Create failed'
        );
      }
      router.push(`/admin/${data.experience.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <h1 className={styles.brand}>Experiences</h1>
        <p className={styles.sub}>Staff admin — draft, publish, and create XR packages</p>
        <nav className={styles.nav}>
          <Link href="/">WebAR</Link>
          <button type="button" onClick={() => void logout()}>
            Log out
          </button>
        </nav>

        {blobConfigured === false && (
          <p className={styles.error}>
            BLOB_READ_WRITE_TOKEN unset — you can edit Untitled No. 7 in memory;
            creating experiences requires Blob.
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <section className={styles.panel}>
          {items.length === 0 && blobConfigured === null ? (
            <p className={styles.status}>Loading…</p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                href={`/admin/${item.id}`}
                className={styles.listRow}
              >
                <strong>{item.title}</strong>
                <code>{item.id}</code>
                <span>
                  Draft {item.hasDraft ? item.draftVersion : '—'} · Published{' '}
                  {item.hasPublished ? item.publishedVersion : '—'}
                </span>
              </Link>
            ))
          )}
        </section>

        <section className={styles.panel} style={{ marginTop: '2rem' }}>
          <h2 className={styles.sectionTitle}>New experience</h2>
          <p className={styles.status}>
            Clones the Untitled No. 7 package. Visitors open it at{' '}
            <code>/e/&#123;slug&#125;</code> after you publish.
          </p>
          <form onSubmit={(e) => void onCreate(e)}>
            <div className={styles.field}>
              <label htmlFor="exp-title">Title</label>
              <input
                id="exp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="exp-id">Slug</label>
              <input
                id="exp-id"
                value={id}
                onChange={(e) => setId(e.target.value.toLowerCase().trim())}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="obsidian-altar"
                required
              />
            </div>
            <div className={styles.actions}>
              <button
                className={styles.btnPrimary}
                type="submit"
                disabled={busy || blobConfigured === false}
              >
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
