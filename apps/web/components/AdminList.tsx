'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import AdminUserMenu from '@/components/AdminUserMenu';
import styles from '@/app/admin/admin.module.css';
import { DEFAULT_EXPERIENCE_ID } from '@/lib/experience-id';

type ExperienceIndexItem = {
  id: string;
  title: string;
  blobConfigured: boolean;
  hasDraft: boolean;
  hasPublished: boolean;
  draftVersion: string | null;
  publishedVersion: string | null;
  archived: boolean;
  archivedAt: string | null;
};

export default function AdminList() {
  const router = useRouter();
  const [items, setItems] = useState<ExperienceIndexItem[]>([]);
  const [blobConfigured, setBlobConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState('');
  const [id, setId] = useState('');

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/experiences');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to list experiences');
    setBlobConfigured(data.blobConfigured === true);
    setIsAdmin(data.isAdmin === true);
    setItems(data.experiences ?? []);
  }, []);

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
        setIsAdmin(data.isAdmin === true);
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
            : data.error === 'experience_archived'
              ? 'That slug is archived — restore it instead'
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

  async function onArchive(experienceId: string) {
    if (!confirm(`Archive ${experienceId}? Visitors will get a 404 until you restore it.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/experiences/${experienceId}/archive`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Archive failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(experienceId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/experiences/${experienceId}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(experienceId: string) {
    const typed = prompt(
      `Permanently delete ${experienceId}? This cannot be undone.\nType the slug to confirm:`
    );
    if (typed !== experienceId) {
      if (typed !== null) setError('Slug did not match — not deleted');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/experiences/${experienceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  const active = items.filter((item) => item.archived !== true);
  const archived = items.filter((item) => item.archived === true);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <h1 className={styles.brand}>Experiences</h1>
        <p className={styles.sub}>
          {isAdmin
            ? 'Studio admin — all experiences'
            : 'Your pieces — draft, publish, and create XR packages'}
        </p>
        <nav className={styles.nav}>
          <Link href="/">WebAR</Link>
          <span className={styles.navEnd}>
            <AdminUserMenu />
          </span>
        </nav>

        {blobConfigured === false && (
          <p className={styles.error}>
            BLOB_READ_WRITE_TOKEN unset — you can edit Untitled No. 7 in memory;
            creating, archiving, and deleting require Blob.
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
            active.map((item) => (
              <div key={item.id} className={styles.listRow}>
                <Link href={`/admin/${item.id}`}>
                  <strong>{item.title}</strong>
                  <code>{item.id}</code>
                  <span>
                    Draft {item.hasDraft ? item.draftVersion : '—'} · Published{' '}
                    {item.hasPublished ? item.publishedVersion : '—'}
                  </span>
                </Link>
                {item.id !== DEFAULT_EXPERIENCE_ID && (
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={busy || blobConfigured === false}
                    onClick={() => void onArchive(item.id)}
                  >
                    Archive
                  </button>
                )}
              </div>
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

        {archived.length > 0 && (
          <section className={styles.panel} style={{ marginTop: '2rem' }}>
            <h2 className={styles.sectionTitle}>Archived</h2>
            <p className={styles.status}>
              Hidden from visitors. Restore to publish again, or delete
              permanently (assets cannot be recovered).
            </p>
            {archived.map((item) => (
              <div key={item.id} className={styles.listRow}>
                <Link href={`/admin/${item.id}`}>
                  <strong>{item.title}</strong>
                  <code>{item.id}</code>
                  <span>
                    Archived {item.archivedAt ? item.archivedAt.slice(0, 10) : ''}
                  </span>
                </Link>
                <div className={styles.listRowActions}>
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={busy}
                    onClick={() => void onRestore(item.id)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    disabled={busy}
                    onClick={() => void onDelete(item.id)}
                  >
                    Delete permanently
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
