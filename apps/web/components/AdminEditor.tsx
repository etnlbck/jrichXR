'use client';

import { upload } from '@vercel/blob/client';
import type {
  ArtistBrand,
  GalleryExperience,
  MuralNode,
  PinForm,
  SpatialPin,
} from '@jrichforms/experience';
import { assetWebPath, mergeBrand, pinColor, pinForm } from '@jrichforms/experience';
import BrandFields from '@/components/BrandFields';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PhoneHandoff from '@/components/PhoneHandoff';
import PinPlacer from '@/components/PinPlacer';
import PinPreview from '@/components/PinPreview';
import { assetPathname } from '@/lib/experience-store-client';
import {
  DEFAULT_EXPERIENCE_ID,
  visitorArPath,
  visitorMarkerPath,
} from '@/lib/experience-id';
import { formatPublishedAt } from '@/lib/format';
import styles from '@/app/admin/admin.module.css';
import { EDITOR_TABS as TABS, type EditorTab as Tab } from '@/lib/editor-tabs';
import { colorLuminance, PIN_COLOR_PRESETS } from '@/lib/pin-color';
import { newPinId, PIN_FORM_LABEL } from '@/lib/pins';

/** Matches the `.pinLayout` two-column breakpoint in admin.module.css. */
const SINGLE_COLUMN_QUERY = '(max-width: 899px)';

type StoreStatus = {
  blobConfigured: boolean;
  hasDraft: boolean;
  hasPublished: boolean;
  draftVersion: string | null;
  publishedVersion: string | null;
  publishedAt: string | null;
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

export default function AdminEditor({
  experienceId,
  initialTab = 'overview',
  initialPinId = null,
}: {
  experienceId: string;
  initialTab?: Tab;
  initialPinId?: string | null;
}) {
  const router = useRouter();
  const [tab, setTabState] = useState<Tab>(initialTab);
  const [experience, setExperienceState] = useState<GalleryExperience | null>(
    null
  );
  /** JSON of the last loaded or saved draft; drives the unsaved indicator. */
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(initialPinId);
  const [pinView, setPinView] = useState<'finished' | 'raw'>('finished');
  const [modelLuminance, setModelLuminance] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSeedExperience = experienceId === DEFAULT_EXPERIENCE_ID;
  const qs = `?id=${encodeURIComponent(experienceId)}`;
  const setExperience = setExperienceState;

  /** Blob ETag of the draft this editor is based on; sent as baseRevision. */
  const revisionRef = useRef<string | null>(null);
  /** Another device saved the draft while this tab had unsaved edits. */
  const [conflict, setConflict] = useState(false);
  const [owner, setOwner] = useState<{
    ownerUserId: string | null;
    brand: ArtistBrand;
    viewerUserId: string;
    isAdmin: boolean;
  } | null>(null);
  const [artists, setArtists] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/experiences/${experienceId}/owner`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setOwner(data);
        if (!data.isAdmin) return;
        return fetch('/api/admin/users')
          .then((res) => (res.ok ? res.json() : { users: [] }))
          .then((list: { users: { id: string; name: string | null; email: string | null }[] }) => {
            if (cancelled) return;
            setArtists(list.users.map((u) => ({ id: u.id, label: u.name || u.email || u.id })));
          });
      })
      .catch(() => {
        /* brand tab falls back to platform defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [experienceId]);

  async function changeOwner(ownerUserId: string) {
    if (!confirm('Change the owner? The new owner’s brand applies on the next publish.')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/experiences/${experienceId}/owner`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Owner change failed');
      setOwner((prev) => (prev ? { ...prev, ownerUserId: data.ownerUserId, brand: data.brand } : prev));
      setMessage('Owner changed — publish to apply their brand');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Owner change failed');
    } finally {
      setBusy(false);
    }
  }

  const applyServerExperience = useCallback(
    (next: GalleryExperience, revision: string | null | undefined) => {
      setExperienceState(next);
      setSavedJson(JSON.stringify(next));
      if (revision !== undefined) revisionRef.current = revision;
      setConflict(false);
    },
    []
  );

  const dirty = useMemo(
    () =>
      experience !== null &&
      savedJson !== null &&
      JSON.stringify(experience) !== savedJson,
    [experience, savedJson]
  );
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  function setTab(next: Tab) {
    setTabState(next);
    const url = `/admin/${experienceId}${next === 'overview' ? '' : `?tab=${next}`}`;
    window.history.replaceState(null, '', url);
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/experience${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    applyServerExperience(data.experience, data.revision ?? null);
    setStatus(data.status);
    setWarning(data.warning ?? null);
  }, [qs, applyServerExperience]);

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
        const loaded = data.experience as GalleryExperience;
        applyServerExperience(loaded, data.revision ?? null);
        setStatus(data.status);
        setWarning(data.warning ?? null);
        const pin = (loaded.gallery.pins ?? []).find((p) => p.id === initialPinId);
        if (pin && pinForm(pin) !== 'both') setPinView(pinForm(pin) as 'finished' | 'raw');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Load failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [qs, applyServerExperience, initialPinId]);

  // Pick up pins placed on a phone when the artist comes back to this tab.
  useEffect(() => {
    let inFlight = false;
    async function refresh() {
      if (document.visibilityState !== 'visible' || inFlight) return;
      if (revisionRef.current === null) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/admin/experience${qs}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.revision || data.revision === revisionRef.current) return;
        if (dirtyRef.current) {
          setConflict(true);
          return;
        }
        applyServerExperience(data.experience, data.revision);
        setStatus(data.status);
        setMessage('Updated with changes from another device');
      } catch {
        /* offline; try again on next focus */
      } finally {
        inFlight = false;
      }
    }
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [qs, applyServerExperience]);

  async function reloadLatest() {
    if (dirty && !confirm('Discard your unsaved changes and load the latest draft?')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await load();
      setMessage('Loaded the latest draft');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setBusy(false);
    }
  }

  /** Returns false when the save failed or hit a conflict. */
  async function save(nextExperience?: GalleryExperience): Promise<boolean> {
    const payload = nextExperience ?? experience;
    if (!payload) return false;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/experience${qs}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: payload,
          baseRevision: revisionRef.current,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setConflict(true);
        return false;
      }
      if (!res.ok) throw new Error(data.message || data.error || 'Save failed');
      applyServerExperience(data.experience, data.revision);
      setStatus(data.status);
      setMessage('Draft saved');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (dirty && !(await save())) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/publish${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseRevision: revisionRef.current }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setConflict(true);
        return;
      }
      if (!res.ok) throw new Error(data.message || data.error || 'Publish failed');
      applyServerExperience(data.experience, data.revision);
      setStatus(data.status);
      const when = formatPublishedAt(data.status?.publishedAt);
      setMessage(
        when
          ? `Published v${data.experience.version} on ${when}`
          : `Published v${data.experience.version}`
      );
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
      applyServerExperience(data.experience, data.revision ?? null);
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

  function addPinAt(position: SpatialPin['position'], form: 'finished' | 'raw') {
    if (!experience) return;
    const pins = experience.gallery.pins ?? [];
    const id = newPinId();
    const pin: SpatialPin = {
      id,
      title: `Pin ${pins.length + 1}`,
      body: '',
      position,
      form,
    };
    setPins([...pins, pin]);
    setSelectedPinId(id);
  }

  function selectPin(id: string | null) {
    setSelectedPinId(id);
    const pin = (experience?.gallery.pins ?? []).find((p) => p.id === id);
    if (pin && pinForm(pin) !== 'both') setPinView(pinForm(pin) as 'finished' | 'raw');
  }

  /** Below the two-column breakpoint the preview sits under the 3D view. */
  function selectPinFromViewport(id: string | null) {
    selectPin(id);
    if (!id || !window.matchMedia(SINGLE_COLUMN_QUERY).matches) return;
    requestAnimationFrame(() =>
      previewRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    );
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
    if (!(await save(next))) return;
    await onUpload(audioAssetId, file);
  }

  if (!experience) {
    return (
      <div className={styles.shell}>
        <p className={styles.status}>{error || 'Loading…'}</p>
      </div>
    );
  }

  const title = experience.gallery.provenance.title;
  const pins = experience.gallery.pins ?? [];
  const selectedPin = pins.find((p) => p.id === selectedPinId);
  const ownerBrand = owner?.brand ?? {};
  const pendingBrand = mergeBrand(ownerBrand, experience.gallery.brandOverrides);
  const currentPinColor = pinColor({ ...experience, brand: pendingBrand });
  const pinColorLowContrast =
    modelLuminance !== null &&
    Math.abs(colorLuminance(currentPinColor) - modelLuminance) < 0.2;
  const finishedModelUrl =
    assetWebPath(experience, 'finished-glb') ??
    (isSeedExperience ? '/assets/models/finished.glb' : null);
  const rawModelUrl =
    assetWebPath(experience, 'raw-glb') ??
    (isSeedExperience ? '/assets/models/raw.glb' : null);
  const statusText = busy
    ? 'Working…'
    : dirty
      ? 'Unsaved changes'
      : (message ?? 'All changes saved');

  return (
    <div className={styles.shell}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin">Experiences</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.brand}>{title}</h1>
          <p className={styles.sub}>
            {experience.id} · Draft{' '}
            {status?.hasDraft ? `v${status.draftVersion}` : `v${experience.version}`}{' '}
            · Published{' '}
            {status?.hasPublished ? (
              <>
                v{status.publishedVersion}
                {status.publishedAt && formatPublishedAt(status.publishedAt) ? (
                  <>
                    {' '}
                    ·{' '}
                    <time dateTime={status.publishedAt}>
                      {formatPublishedAt(status.publishedAt)}
                    </time>
                  </>
                ) : null}
              </>
            ) : (
              '—'
            )}
            {status && !status.blobConfigured ? ' · Blob missing' : ''}
          </p>
        </div>
        <div className={styles.actions}>
          <a
            className={styles.btn}
            href={visitorArPath(experienceId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Preview in AR
          </a>
          <a
            className={styles.btn}
            href={visitorMarkerPath(experienceId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Print marker
          </a>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Experience sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

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
      {conflict && (
        <div className={styles.notice} role="alert">
          <span>
            This draft was changed on another device, for example pins placed
            on your phone. Saving now would overwrite those changes.
          </span>
          <button
            type="button"
            className={styles.btn}
            disabled={busy}
            onClick={() => void reloadLatest()}
          >
            Load latest
          </button>
        </div>
      )}

      {tab === 'overview' && (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Overview</h2>
          <p className={styles.status}>
            Publish copies the draft to the visitor WebAR package (Blob). Aura
            Lenses still uses prepare-lenses / external API.
          </p>
          <div className={styles.actions}>
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
            <a
              className={styles.btn}
              href={`data:application/json,${encodeURIComponent(JSON.stringify(experience, null, 2))}`}
              download={`${experience.id}-draft.json`}
            >
              Export JSON
            </a>
          </div>

          <div className={styles.dangerZone}>
            <h3 className={styles.sectionTitle}>Danger zone</h3>
            <p className={styles.status}>
              {isSeedExperience
                ? 'Reset replaces the draft with the repo seed.'
                : 'Reset replaces the draft with a fresh Untitled No. 7 clone. Archive hides the piece from visitors.'}
            </p>
            <div className={styles.actions}>
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
        </section>
      )}

      {tab === 'assets' && (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Assets</h2>
          <p className={styles.status}>
            Max GLB {(experience.gallery.maxGlbBytes / (1024 * 1024)).toFixed(0)}{' '}
            MB. Uploads go to public Vercel Blob and update draft webPath.
          </p>
          {pins.length > 0 && (
            <p className={styles.notice}>
              This experience has {pins.length} pin{pins.length === 1 ? '' : 's'}.
              Pins are stored relative to the model, so a replacement GLB should
              keep the same origin and scale or the pins will float off the
              surface. Check them on the Pins tab after uploading.
            </p>
          )}
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
        </section>
      )}

      {tab === 'pins' && (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Spatial pins</h2>
          <p className={styles.status}>
            Pins stick to the sculpture in WebAR. Tap a pin to open its note.
            Save the draft from the bar below when you are done placing.
          </p>
          <div className={styles.actions}>
            <div className={styles.segmented} role="group" aria-label="Form shown">
              {(['finished', 'raw'] as const).map((form) => (
                <button
                  key={form}
                  type="button"
                  aria-pressed={pinView === form}
                  disabled={form === 'raw' && !rawModelUrl}
                  onClick={() => setPinView(form)}
                >
                  {form === 'finished' ? 'Finished' : 'Raw'}
                </button>
              ))}
            </div>
            <a className={styles.btn} href={`/admin/place/${experienceId}`}>
              Place in AR
            </a>
          </div>
          <div className={styles.field}>
            <label id="pin-color-label" htmlFor="pin-color-custom">
              Pin color
            </label>
            <div
              className={styles.swatches}
              role="group"
              aria-labelledby="pin-color-label"
            >
              {PIN_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  className={styles.swatch}
                  style={{ background: preset.hex }}
                  aria-label={preset.label}
                  title={preset.label}
                  aria-pressed={currentPinColor === preset.hex}
                  onClick={() => updateGallery({ pinColor: preset.hex })}
                />
              ))}
              <input
                id="pin-color-custom"
                type="color"
                className={styles.swatchCustom}
                value={currentPinColor}
                aria-label="Custom pin color"
                onChange={(e) =>
                  updateGallery({ pinColor: e.target.value.toLowerCase() })
                }
              />
              <button
                type="button"
                className={styles.btn}
                disabled={experience.gallery.pinColor === undefined}
                onClick={() => updateGallery({ pinColor: undefined })}
              >
                Default
              </button>
            </div>
            {pinColorLowContrast && (
              <p className={styles.status}>
                This color may be hard to see on the sculpture. The outline
                helps, but a lighter or darker color will stand out more.
              </p>
            )}
          </div>
          <PhoneHandoff experienceId={experienceId} />
          <div className={styles.pinLayout}>
            <PinPlacer
              pinColor={currentPinColor}
              onModelLuminance={setModelLuminance}
              modelUrl={finishedModelUrl}
              rawModelUrl={rawModelUrl}
              dracoDecoderPath={experience.gallery.dracoDecoderPath}
              pins={pins}
              selectedId={selectedPinId}
              showing={pinView}
              onSelect={selectPinFromViewport}
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
                      onClick={() => selectPin(pin.id)}
                    >
                      {pin.title || pin.id}
                      <span className={styles.pinFormTag}>
                        {PIN_FORM_LABEL[pinForm(pin)]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!selectedPin && (
                <p className={styles.status}>
                  Click or tap the model to add a pin, or pick one from the list.
                </p>
              )}
              {selectedPin && (
                <>
                  <PinPreview
                    ref={previewRef}
                    pinId={selectedPin.id}
                    title={selectedPin.title}
                    body={selectedPin.body}
                    audioUrl={
                      selectedPin.audioAssetId
                        ? assetWebPath(experience, selectedPin.audioAssetId) || null
                        : null
                    }
                  />
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
                    <label htmlFor="pin-form">Shows on</label>
                    <select
                      id="pin-form"
                      value={pinForm(selectedPin)}
                      onChange={(e) =>
                        updatePin(selectedPin.id, {
                          form: e.target.value as PinForm,
                        })
                      }
                    >
                      <option value="finished">Finished</option>
                      <option value="raw">Raw</option>
                      <option value="both">Both</option>
                    </select>
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
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'brand' && (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Brand overrides</h2>
          <p className={styles.status}>
            This sculpture uses the owner’s{' '}
            <Link href="/admin/brand">brand profile</Link>. Anything set here
            replaces the profile for this sculpture only. Changes reach visitors
            when you publish.
          </p>
          {owner?.isAdmin && !isSeedExperience && artists.length > 0 && (
            <div className={styles.field} style={{ maxWidth: '22rem' }}>
              <label htmlFor="owner-artist">Owner</label>
              <select
                id="owner-artist"
                value={owner.ownerUserId ?? ''}
                disabled={busy}
                onChange={(e) => e.target.value && void changeOwner(e.target.value)}
              >
                {owner.ownerUserId === null && <option value="">No owner</option>}
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {owner && (
            <BrandFields
              value={experience.gallery.brandOverrides ?? {}}
              onChange={(next) =>
                updateGallery({
                  brandOverrides: Object.keys(next).length > 0 ? next : undefined,
                })
              }
              inherited={ownerBrand}
              uploadUserId={owner.ownerUserId ?? owner.viewerUserId}
              disabled={busy}
              previewTitle={experience.gallery.title}
            />
          )}
        </section>
      )}

      <div className={styles.actionBar}>
        <span
          className={styles.actionBarStatus}
          data-dirty={dirty}
          role="status"
          aria-live="polite"
        >
          {statusText}
        </span>
        <button
          type="button"
          className={styles.btn}
          disabled={busy || !dirty}
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
      </div>
    </div>
  );
}
