'use client';

import { upload } from '@vercel/blob/client';
import type { GalleryExperience, MuralNode } from '@jrichforms/experience';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { assetPathname } from '@/lib/experience-store-client';
import { DEFAULT_EXPERIENCE_ID, visitorArPath } from '@/lib/experience-id';
import styles from '@/app/admin/admin.module.css';

type Tab = 'overview' | 'provenance' | 'placement' | 'assets' | 'nodes';

type StoreStatus = {
  blobConfigured: boolean;
  hasDraft: boolean;
  hasPublished: boolean;
  draftVersion: string | null;
  publishedVersion: string | null;
};

const ASSET_SLOTS: Array<{
  id: string;
  label: string;
  accept: string;
}> = [
  { id: 'finished-glb', label: 'Finished GLB', accept: '.glb,model/gltf-binary' },
  { id: 'raw-glb', label: 'Raw GLB', accept: '.glb,model/gltf-binary' },
  { id: 'guide-marks', label: 'Guide marks PNG', accept: 'image/png,.png' },
  { id: 'narration', label: 'Narration MP3', accept: 'audio/mpeg,.mp3' },
  { id: 'marker-display', label: 'Marker / print PNG', accept: 'image/png,.png' },
];

export default function AdminEditor({ experienceId }: { experienceId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [experience, setExperience] = useState<GalleryExperience | null>(null);
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSeedExperience = experienceId === DEFAULT_EXPERIENCE_ID;
  const qs = `?id=${encodeURIComponent(experienceId)}`;

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/experience${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setExperience(data.experience);
    setStatus(data.status);
    setWarning(data.warning ?? null);
  }, [qs]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/experience${qs}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setExperience(data.experience);
        setStatus(data.status);
        setWarning(data.warning ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Load failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [qs]);

  async function save() {
    if (!experience) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/experience${qs}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Save failed');
      setExperience(data.experience);
      setStatus(data.status);
      setMessage('Draft saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await save();
      const res = await fetch(`/api/admin/publish${qs}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Publish failed');
      setExperience(data.experience);
      setStatus(data.status);
      setMessage(`Published v${data.experience.version}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  async function seed(force = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/seed${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      setExperience(data.experience);
      setStatus(data.status);
      setMessage(
        force
          ? isSeedExperience
            ? 'Draft reset from seed'
            : 'Draft reset from template'
          : data.seeded
            ? 'Seeded draft'
            : 'Draft already present'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(assetId: string, file: File) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const pathname = assetPathname(assetId, file.name, experienceId);
      await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
        clientPayload: JSON.stringify({ assetId, experienceId }),
      });
      await load();
      setMessage(`Uploaded ${assetId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  function updateGallery(patch: Partial<GalleryExperience['gallery']>) {
    if (!experience) return;
    setExperience({
      ...experience,
      gallery: { ...experience.gallery, ...patch },
    });
  }

  function updateNode(id: string, patch: Partial<MuralNode>) {
    if (!experience) return;
    setExperience({
      ...experience,
      nodes: experience.nodes.map((n) =>
        n.id === id ? { ...n, ...patch } : n
      ),
    });
  }

  if (!experience) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.status}>{error || 'Loading…'}</p>
        </div>
      </div>
    );
  }

  const title = experience.gallery.provenance.title;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <h1 className={styles.brand}>{title}</h1>
        <p className={styles.sub}>
          Experience CMS · {experience.id} · draft v{experience.version}
        </p>

        <nav className={styles.nav}>
          {(
            [
              ['overview', 'Overview'],
              ['provenance', 'Provenance'],
              ['placement', 'Placement'],
              ['assets', 'Assets'],
              ['nodes', 'Nodes'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-active={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          <Link href="/admin">All experiences</Link>
          <Link href={visitorArPath(experienceId)}>WebAR</Link>
          <button type="button" onClick={() => void logout()}>
            Log out
          </button>
        </nav>

        {status && (
          <p className={styles.status}>
            Blob {status.blobConfigured ? 'ready' : 'missing'} · Draft{' '}
            {status.hasDraft ? status.draftVersion : '—'} · Published{' '}
            {status.hasPublished ? status.publishedVersion : '—'}
          </p>
        )}
        {warning && <p className={styles.error}>{warning}</p>}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {message && <p className={styles.ok}>{message}</p>}

        {tab === 'overview' && (
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Overview</h2>
            <p className={styles.status}>
              Publish copies the draft to the visitor WebAR package (Blob). Aura
              Lenses still uses prepare-lenses / external API.
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btn}
                disabled={busy}
                onClick={() => void save()}
              >
                Save draft
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={busy}
                onClick={() => void publish()}
              >
                Publish
              </button>
              {isSeedExperience && (
                <button
                  type="button"
                  className={styles.btn}
                  disabled={busy}
                  onClick={() => void seed(false)}
                >
                  Seed if empty
                </button>
              )}
              <button
                type="button"
                className={styles.btnDanger}
                disabled={busy}
                onClick={() => {
                  const ok = confirm(
                    isSeedExperience
                      ? 'Replace draft with repo seed?'
                      : 'Replace draft with a fresh Untitled No. 7 clone?'
                  );
                  if (ok) void seed(true);
                }}
              >
                {isSeedExperience ? 'Reset from seed' : 'Reset from template'}
              </button>
              <a
                className={styles.btn}
                href={`data:application/json,${encodeURIComponent(JSON.stringify(experience, null, 2))}`}
                download={`${experience.id}-draft.json`}
              >
                Export JSON
              </a>
            </div>
          </section>
        )}

        {tab === 'provenance' && (
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Provenance & shop</h2>
            <div className={styles.field}>
              <label>Gate title</label>
              <input
                value={experience.gallery.title}
                onChange={(e) => updateGallery({ title: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Piece title</label>
              <input
                value={experience.gallery.provenance.title}
                onChange={(e) =>
                  updateGallery({
                    provenance: {
                      ...experience.gallery.provenance,
                      title: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className={styles.field}>
              <label>Material</label>
              <input
                value={experience.gallery.provenance.material}
                onChange={(e) =>
                  updateGallery({
                    provenance: {
                      ...experience.gallery.provenance,
                      material: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Dimensions</label>
                <input
                  value={experience.gallery.provenance.dimensions}
                  onChange={(e) =>
                    updateGallery({
                      provenance: {
                        ...experience.gallery.provenance,
                        dimensions: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className={styles.field}>
                <label>Year</label>
                <input
                  value={experience.gallery.provenance.year}
                  onChange={(e) =>
                    updateGallery({
                      provenance: {
                        ...experience.gallery.provenance,
                        year: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className={styles.field}>
              <label>Exhibition</label>
              <input
                value={experience.gallery.provenance.exhibition}
                onChange={(e) =>
                  updateGallery({
                    provenance: {
                      ...experience.gallery.provenance,
                      exhibition: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className={styles.field}>
              <label>Shopify experience slug</label>
              <input
                value={experience.gallery.shop.experienceSlug}
                onChange={(e) =>
                  updateGallery({
                    shop: {
                      ...experience.gallery.shop,
                      experienceSlug: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className={styles.field}>
              <label>Shop path</label>
              <input
                value={experience.gallery.shop.shopPath}
                onChange={(e) =>
                  updateGallery({
                    shop: {
                      ...experience.gallery.shop,
                      shopPath: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className={styles.field}>
              <label>Acquire / inquire URL</label>
              <input
                value={experience.gallery.shop.acquireUrl}
                onChange={(e) =>
                  updateGallery({
                    shop: {
                      ...experience.gallery.shop,
                      acquireUrl: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={busy}
                onClick={() => void save()}
              >
                Save draft
              </button>
            </div>
          </section>
        )}

        {tab === 'placement' && (
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Placement & morph</h2>
            <div className={styles.field}>
              <label>physicalWidthM (meters)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="2"
                value={experience.marker.physicalWidthM}
                onChange={(e) =>
                  setExperience({
                    ...experience,
                    marker: {
                      ...experience.marker,
                      physicalWidthM: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Morph duration (ms)</label>
                <input
                  type="number"
                  value={experience.gallery.morph.durationMs}
                  onChange={(e) =>
                    updateGallery({
                      morph: {
                        ...experience.gallery.morph,
                        durationMs: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className={styles.field}>
                <label>Overlay fade (ms)</label>
                <input
                  type="number"
                  value={experience.gallery.morph.overlayFadeMs}
                  onChange={(e) =>
                    updateGallery({
                      morph: {
                        ...experience.gallery.morph,
                        overlayFadeMs: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className={styles.field}>
              <label>
                <input
                  type="checkbox"
                  checked={experience.gallery.usePlaceholderCube}
                  onChange={(e) =>
                    updateGallery({ usePlaceholderCube: e.target.checked })
                  }
                />{' '}
                Use placeholder cube
              </label>
            </div>
            <div className={styles.field}>
              <label>
                <input
                  type="checkbox"
                  checked={experience.gallery.audio.unlockOnBegin}
                  onChange={(e) =>
                    updateGallery({
                      audio: {
                        ...experience.gallery.audio,
                        unlockOnBegin: e.target.checked,
                      },
                    })
                  }
                />{' '}
                Unlock audio on Begin
              </label>
            </div>
            <div className={styles.field}>
              <label>
                <input
                  type="checkbox"
                  checked={experience.gallery.audio.playOnFirstEnterRaw}
                  onChange={(e) =>
                    updateGallery({
                      audio: {
                        ...experience.gallery.audio,
                        playOnFirstEnterRaw: e.target.checked,
                      },
                    })
                  }
                />{' '}
                Play narration on first enter raw
              </label>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={busy}
                onClick={() => void save()}
              >
                Save draft
              </button>
            </div>
          </section>
        )}

        {tab === 'assets' && (
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Assets</h2>
            <p className={styles.status}>
              Max GLB {(experience.gallery.maxGlbBytes / (1024 * 1024)).toFixed(0)}{' '}
              MB. Uploads go to public Vercel Blob and update draft webPath.
            </p>
            {ASSET_SLOTS.map((slot) => {
              const meta = experience.assets[slot.id];
              return (
                <div key={slot.id} className={styles.assetRow}>
                  <strong>{slot.label}</strong>
                  <label className={styles.btn}>
                    Upload
                    <input
                      type="file"
                      accept={slot.accept}
                      hidden
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUpload(slot.id, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <code>{meta?.webPath || meta?.contentPath || '—'}</code>
                  {meta?.interim ? <span>interim</span> : null}
                  {meta?.status === 'pending' ? <span>pending</span> : null}
                </div>
              );
            })}
          </section>
        )}

        {tab === 'nodes' && (
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Nodes</h2>
            {experience.nodes.map((node) => (
              <div key={node.id} className={styles.panel}>
                <strong>
                  {node.id} · {node.type} · {node.trigger}
                </strong>
                <div className={styles.row}>
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <div key={axis} className={styles.field}>
                      <label>pos.{axis}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={node.position[axis]}
                        onChange={(e) =>
                          updateNode(node.id, {
                            position: {
                              ...node.position,
                              [axis]: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.field}>
                  <label>scale (number)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={
                      typeof node.scale === 'number'
                        ? node.scale
                        : (node.scale?.x ?? 1)
                    }
                    onChange={(e) =>
                      updateNode(node.id, { scale: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            ))}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={busy}
                onClick={() => void save()}
              >
                Save draft
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
