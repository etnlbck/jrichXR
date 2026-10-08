'use client';

import { upload } from '@vercel/blob/client';
import type {
  GalleryExperience,
  MuralNode,
  SpatialPin,
} from '@jrichforms/experience';
import { assetWebPath } from '@jrichforms/experience';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AdminUserMenu from '@/components/AdminUserMenu';
import PinPlacer from '@/components/PinPlacer';
import { assetPathname } from '@/lib/experience-store-client';
import { DEFAULT_EXPERIENCE_ID, visitorArPath } from '@/lib/experience-id';
import styles from '@/app/admin/admin.module.css';

type Tab = 'overview' | 'provenance' | 'placement' | 'assets' | 'nodes' | 'pins';

type StoreStatus = {
  blobConfigured: boolean;
  hasDraft: boolean;
  hasPublished: boolean;
  draftVersion: string | null;
  publishedVersion: string | null;
  archived: boolean;
  archivedAt: string | null;
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
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
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

  async function save(nextExperience?: GalleryExperience) {
    const payload = nextExperience ?? experience;
    if (!payload) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/experience${qs}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experience: payload }),
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

  async function archive() {
    if (
      !confirm(
        'Archive this experience? Visitors will get a 404 until you restore it.'
      )
    ) {
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
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/experiences/${experienceId}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setStatus(data.status);
      setMessage('Restored — visitors can see a published package again');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
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

  function setPins(next: SpatialPin[]) {
    updateGallery({ pins: next });
  }

  function updatePin(id: string, patch: Partial<SpatialPin>) {
    if (!experience) return;
    const pins = experience.gallery.pins ?? [];
    setPins(pins.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addPinAt(position: SpatialPin['position']) {
    if (!experience) return;
    const pins = experience.gallery.pins ?? [];
    const id = `pin-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
    const pin: SpatialPin = {
      id,
      title: `Pin ${pins.length + 1}`,
      body: '',
      position,
    };
    setPins([...pins, pin]);
    setSelectedPinId(id);
  }

  async function uploadPinAudio(pin: SpatialPin, file: File) {
    if (!experience) return;
    const audioAssetId = `pin-${pin.id}`;
    const next: GalleryExperience = {
      ...experience,
      gallery: {
        ...experience.gallery,
        pins: (experience.gallery.pins ?? []).map((p) =>
          p.id === pin.id ? { ...p, audioAssetId } : p
        ),
      },
    };
    setExperience(next);
    await save(next);
    await onUpload(audioAssetId, file);
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
  const pins = experience.gallery.pins ?? [];
  const selectedPin = pins.find((p) => p.id === selectedPinId);

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
              ['pins', 'Pins'],
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
          <span className={styles.navEnd}>
            <AdminUserMenu />
          </span>
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
        {status?.archived && (
          <p className={styles.error} role="status">
            This experience is archived. Visitors see a 404 until you restore it.
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
              {!isSeedExperience && status?.archived !== true && (
                <button
                  type="button"
                  className={styles.btnDanger}
                  disabled={busy}
                  onClick={() => void archive()}
                >
                  Archive
                </button>
              )}
              {!isSeedExperience && status?.archived === true && (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={busy}
                  onClick={() => void restore()}
                >
                  Restore
                </button>
              )}
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

        {tab === 'pins' && (
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Spatial pins</h2>
            <p className={styles.status}>
              Pins stick to the sculpture in WebAR. Tap a pin to open its note.
              Save the draft when you are done placing.
            </p>
            <div className={styles.pinLayout}>
              <PinPlacer
                modelUrl={
                  assetWebPath(experience, 'finished-glb') ??
                  (isSeedExperience ? '/assets/models/finished.glb' : null)
                }
                dracoDecoderPath={experience.gallery.dracoDecoderPath}
                pins={pins}
                selectedId={selectedPinId}
                onSelect={setSelectedPinId}
                onAddPin={addPinAt}
                onMovePin={(id, position) => updatePin(id, { position })}
              />
              <div className={styles.panel}>
                {pins.length > 0 && (
                  <div className={styles.pinList}>
                    {pins.map((pin) => (
                      <button
                        key={pin.id}
                        type="button"
                        className={styles.pinListButton}
                        data-active={selectedPinId === pin.id}
                        onClick={() => setSelectedPinId(pin.id)}
                      >
                        {pin.title || pin.id}
                      </button>
                    ))}
                  </div>
                )}
                {!selectedPin && (
                  <p className={styles.status}>
                    Click the model to add a pin, or pick one from the list.
                  </p>
                )}
                {selectedPin && (
                  <>
                    <div className={styles.field}>
                      <label>Title</label>
                      <input
                        value={selectedPin.title}
                        onChange={(e) =>
                          updatePin(selectedPin.id, { title: e.target.value })
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Body</label>
                      <textarea
                        value={selectedPin.body}
                        onChange={(e) =>
                          updatePin(selectedPin.id, { body: e.target.value })
                        }
                      />
                    </div>
                    <div className={styles.row}>
                      {(['x', 'y', 'z'] as const).map((axis) => (
                        <div key={axis} className={styles.field}>
                          <label>pos.{axis}</label>
                          <input
                            type="number"
                            step="0.001"
                            value={selectedPin.position[axis]}
                            onChange={(e) =>
                              updatePin(selectedPin.id, {
                                position: {
                                  ...selectedPin.position,
                                  [axis]: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className={styles.assetRow}>
                      <strong>Pin audio</strong>
                      <label className={styles.btn}>
                        Upload MP3
                        <input
                          type="file"
                          accept="audio/mpeg,.mp3"
                          hidden
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadPinAudio(selectedPin, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <code>
                        {selectedPin.audioAssetId
                          ? assetWebPath(experience, selectedPin.audioAssetId) ||
                            '—'
                          : '—'}
                      </code>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        disabled={busy}
                        onClick={() => {
                          setPins(pins.filter((p) => p.id !== selectedPin.id));
                          setSelectedPinId(null);
                        }}
                      >
                        Delete pin
                      </button>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        disabled={busy}
                        onClick={() => void save()}
                      >
                        Save draft
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
