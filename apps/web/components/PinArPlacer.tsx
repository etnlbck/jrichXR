'use client';

import { pinForm, type PinForm, type SpatialPin } from '@jrichforms/experience';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { brandStyle } from '@/lib/brand-style';
import type { AppConfig } from '@/lib/config';
import { formatPublishedAt } from '@/lib/format';
import {
  applyPinChanges,
  emptyPinChanges,
  hasPinChanges,
  newPinId,
  PIN_FORM_LABEL,
  recordPinChange,
  recordPinRemoval,
  type PinChange,
  type PinChanges,
} from '@/lib/pins';
import { createScene, type ScenePin } from '@/lib/scene';
import type { UiState } from '@/lib/types';
import {
  bootXr,
  requestMotionPermission,
  type CameraStatus,
  type XrIssue,
} from '@/lib/xr-boot';
import XrIssueSheet from '@/components/XrIssueSheet';
import ar from './ArExperience.module.css';
import styles from './PinArPlacer.module.css';

type Props = {
  experienceId: string;
  appConfig: AppConfig;
  initialPins: SpatialPin[];
  initialRevision: string | null;
  canSave: boolean;
  /** Desktop stand-in: place on the model without the camera. */
  stage?: boolean;
};

type Showing = 'finished' | 'raw';

/** On-screen distance of one nudge, in CSS pixels. */
const NUDGE_PX = 6;

function storageKey(experienceId: string) {
  return `jrf:pending-pins:${experienceId}`;
}

function readPending(experienceId: string): PinChanges | null {
  try {
    const raw = window.localStorage.getItem(storageKey(experienceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PinChanges;
    if (!Array.isArray(parsed.upsert) || !Array.isArray(parsed.remove)) return null;
    return hasPinChanges(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toScenePins(pins: SpatialPin[]): ScenePin[] {
  return pins.map((p) => ({
    id: p.id,
    title: p.title,
    position: p.position,
    form: pinForm(p),
  }));
}

function changeCount(changes: PinChanges) {
  return changes.upsert.length + changes.remove.length;
}

export default function PinArPlacer({
  experienceId,
  appConfig: config,
  initialPins,
  initialRevision,
  canSave,
  stage = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof createScene> | null>(null);
  const bootedRef = useRef(false);
  const revisionRef = useRef(initialRevision);
  const restoredRef = useRef(false);

  const [phase, setPhase] = useState<UiState>('START');
  const [modelsReady, setModelsReady] = useState(false);
  const [hasRaw, setHasRaw] = useState(false);
  const [booting, setBooting] = useState(false);
  const [issue, setIssue] = useState<XrIssue | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const [showing, setShowing] = useState<Showing>('finished');

  const [savedPins, setSavedPins] = useState<SpatialPin[]>(initialPins);
  const [changes, setChanges] = useState<PinChanges>(emptyPinChanges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);
  const [publishConflict, setPublishConflict] = useState(false);

  const pins = useMemo(() => applyPinChanges(savedPins, changes), [savedPins, changes]);
  const pending = hasPinChanges(changes);
  const selected = pins.find((p) => p.id === selectedId) ?? null;
  const anchored = phase === 'ANCHORED' || phase === 'RAW' || phase === 'FINISHED';

  useEffect(() => {
    sceneRef.current = createScene(config, {
      onState: setPhase,
      onEnterRaw: () => setShowing('raw'),
      onEnterFinished: () => setShowing('finished'),
      onLoadError: (message) => {
        console.error('[jrf] model load failed:', message);
        setIssue('generic');
      },
      onModelsReady: () => {
        setModelsReady(true);
        setBooting(false);
        setHasRaw(sceneRef.current?.hasRawModel() ?? false);
        if (stage) setPhase('ANCHORED');
        // Restore pins placed earlier on this phone that never reached the server.
        if (restoredRef.current) return;
        restoredRef.current = true;
        const restored = readPending(experienceId);
        if (!restored) return;
        setChanges(restored);
        const n = changeCount(restored);
        setNotice(
          `Restored ${n} unsaved change${n === 1 ? '' : 's'} from earlier. Save to keep them.`
        );
      },
    });
  }, [config, stage, experienceId]);

  useEffect(() => {
    if (!stage || !canvasRef.current || !sceneRef.current) return;
    const stop = sceneRef.current.startStage(canvasRef.current);
    return stop;
  }, [stage]);

  useEffect(() => {
    if (!restoredRef.current) return;
    const key = storageKey(experienceId);
    if (hasPinChanges(changes)) window.localStorage.setItem(key, JSON.stringify(changes));
    else window.localStorage.removeItem(key);
  }, [changes, experienceId]);

  useEffect(() => {
    sceneRef.current?.setPins(toScenePins(pins));
  }, [pins, modelsReady]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setSelectedPin(selectedId);
    // Hold the model still while a pin is being edited so taps land precisely.
    scene.holdPose(selectedId !== null);
  }, [selectedId]);

  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending]);

  const change = useCallback((c: PinChange) => {
    setChanges((prev) => recordPinChange(prev, c));
    setNotice(null);
  }, []);

  const showForm = useCallback(
    (form: Showing) => {
      const scene = sceneRef.current;
      if (!scene || scene.showingForm() === form) return;
      if (form === 'raw' && !hasRaw) return;
      const next = scene.toggleMorph();
      if (next) setPhase(next);
    },
    [hasRaw]
  );

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setMoving(false);
      const pin = pins.find((p) => p.id === id);
      if (pin && pinForm(pin) !== 'both') showForm(pinForm(pin) as Showing);
    },
    [pins, showForm]
  );

  async function begin() {
    if (bootedRef.current || !canvasRef.current || !sceneRef.current) return;
    const motion = requestMotionPermission();
    bootedRef.current = true;
    setBooting(true);
    setPhase('SCANNING');
    setIssue(null);
    await bootXr({
      canvas: canvasRef.current,
      scene: sceneRef.current,
      config,
      motion,
      onStatus: setCameraStatus,
      onError: (next) => {
        setIssue(next);
        setPhase('ERROR');
        setBooting(false);
      },
    });
  }

  function ndcFromEvent(event: MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

  function handleTap(event: MouseEvent<HTMLCanvasElement>) {
    const scene = sceneRef.current;
    if (!scene || !anchored || !modelsReady || saving) return;
    const ndc = ndcFromEvent(event);

    if (moving && selected) {
      const hit = scene.pickSurface(ndc.x, ndc.y);
      if (!hit) {
        setNotice('Tap on the model to drop the pin there.');
        return;
      }
      const form = pinForm(selected);
      change({
        id: selected.id,
        position: hit.point,
        ...(form !== 'both' && form !== hit.form ? { form: hit.form } : {}),
      });
      setMoving(false);
      return;
    }

    const pinId = scene.pickPin(ndc.x, ndc.y, { includeLabels: false });
    if (pinId) {
      select(pinId);
      return;
    }
    if (selectedId) {
      select(null);
      return;
    }

    const hit = scene.pickSurface(ndc.x, ndc.y);
    if (!hit) {
      setNotice('Tap directly on the model to add a pin.');
      return;
    }
    const id = newPinId();
    change({
      id,
      position: hit.point,
      form: hit.form,
      title: `Pin ${pins.length + 1}`,
      body: '',
    });
    setSelectedId(id);
    setMoving(false);
  }

  function nudge(dxPx: number, dyPx: number) {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    if (!scene || !canvas || !selected) return;
    const at = scene.pinNdc(selected.id);
    if (!at) return;
    const x = at.x + (2 * dxPx) / Math.max(canvas.clientWidth, 1);
    const y = at.y - (2 * dyPx) / Math.max(canvas.clientHeight, 1);
    const hit = scene.pickSurface(x, y);
    if (!hit) {
      setNotice('That nudge would leave the model surface.');
      return;
    }
    change({ id: selected.id, position: hit.point });
  }

  function removeSelected() {
    if (!selected) return;
    if (!confirm(`Delete “${selected.title || 'this pin'}”?`)) return;
    setChanges((prev) => recordPinRemoval(prev, selected.id));
    select(null);
  }

  /** Returns false when nothing could be saved. */
  async function save(): Promise<boolean> {
    if (!pending) return true;
    if (!canSave) {
      setNotice('Saving needs Blob storage, which is not configured here.');
      return false;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/admin/experience/pins?id=${encodeURIComponent(experienceId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Save failed');
      revisionRef.current = data.revision;
      setSavedPins(data.pins);
      setChanges(emptyPinChanges());
      setSavedOnce(true);
      setPublishConflict(false);
      setNotice('Saved to draft. Visitors see it after you publish.');
      return true;
    } catch (err) {
      setNotice(
        `${err instanceof Error ? err.message : 'Save failed'}. Your pins are kept on this phone; try again.`
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function reloadDraft() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/experience?id=${encodeURIComponent(experienceId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reload failed');
      revisionRef.current = data.revision ?? null;
      setSavedPins(data.experience.gallery.pins ?? []);
      setPublishConflict(false);
      setNotice('Loaded the latest draft. Check it, then publish.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Reload failed');
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (
      !confirm(
        'Publish the draft now? Visitors will see these pins and any other saved draft changes.'
      )
    ) {
      return;
    }
    if (!(await save())) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/publish?id=${encodeURIComponent(experienceId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseRevision: revisionRef.current }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setPublishConflict(true);
        setNotice('The draft changed on another device since you loaded it.');
        return;
      }
      if (!res.ok) throw new Error(data.message || data.error || 'Publish failed');
      revisionRef.current = data.revision;
      const when = formatPublishedAt(data.status?.publishedAt);
      setNotice(
        when
          ? `Published v${data.experience.version} on ${when}. Visitors see your pins now.`
          : `Published v${data.experience.version}. Visitors see your pins now.`
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setSaving(false);
    }
  }

  async function leaveTo(href: string) {
    if (pending && !(await save())) return;
    window.location.assign(href);
  }

  const studioHref = `/admin/${experienceId}?tab=pins`;
  const visibleCount = pins.filter((p) => {
    const f = pinForm(p);
    return f === 'both' || f === showing;
  }).length;
  const askingCamera = !stage && phase === 'SCANNING' && cameraStatus === 'requesting';
  const showLoading =
    (askingCamera || booting || (phase === 'SCANNING' && !modelsReady)) &&
    phase !== 'ERROR';
  const hint = `Tap the ${showing} model to add a pin, or tap a pin to edit it`;

  return (
    <div className={ar.root} style={brandStyle(config.brand)}>
      <canvas id="camerafeed" ref={canvasRef} className={ar.canvas} onClick={handleTap} />

      {!stage && phase === 'START' && (
        <div className={ar.overlay}>
          <div className={ar.gateCard}>
            <h1>Place pins</h1>
            <p>
              Point your phone at the placard. The virtual model appears on it;
              tap the model to drop a pin.
            </p>
            <button type="button" className={ar.beginBtn} onClick={() => void begin()}>
              Start camera
            </button>
            <small>
              No placard nearby?{' '}
              <a className={styles.link} href={`/admin/place/${experienceId}?stage=1`}>
                Place on the model without the camera
              </a>
              , or go{' '}
              <a className={styles.link} href={studioHref}>
                back to the studio
              </a>
              .
            </small>
          </div>
        </div>
      )}

      {showLoading && (
        <div className={ar.loading} role="status" aria-live="polite">
          <div className={ar.loadingPulse} />
          <p>
            {askingCamera ? 'Allow camera access when your browser asks' : 'Loading the draft…'}
          </p>
        </div>
      )}

      {!stage && phase === 'SCANNING' && modelsReady && !booting && (
        <div className={ar.hint}>
          <div className={ar.reticle} />
          <p>Aim at the placard…</p>
        </div>
      )}

      <div className={styles.toolbar}>
        <button type="button" className={styles.toolBtn} onClick={() => void leaveTo(studioHref)}>
          Done
        </button>
        <div className={styles.segmented} role="group" aria-label="Form shown">
          {(['finished', 'raw'] as const).map((form) => (
            <button
              key={form}
              type="button"
              aria-pressed={showing === form}
              disabled={!modelsReady || (form === 'raw' && !hasRaw)}
              onClick={() => showForm(form)}
            >
              {form === 'finished' ? 'Finished' : 'Raw'}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.toolBtnPrimary}
          disabled={!pending || saving}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : pending ? `Save (${changeCount(changes)})` : 'Saved'}
        </button>
      </div>

      {anchored && modelsReady && (
        <p className={styles.count}>
          {visibleCount} of {pins.length} pin{pins.length === 1 ? '' : 's'} on {showing}
          {selected ? ' · tracking paused while editing' : ''}
        </p>
      )}

      {issue && <XrIssueSheet issue={issue} />}

      {selected ? (
        <div className={`${ar.panel} ${styles.sheet}`}>
          <button
            type="button"
            className={ar.panelClose}
            onClick={() => select(null)}
            aria-label="Close"
          >
            ×
          </button>
          <label className={styles.field}>
            <span>Title</span>
            <input
              value={selected.title}
              maxLength={200}
              onChange={(e) => change({ id: selected.id, title: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span>Note</span>
            <textarea
              rows={2}
              value={selected.body}
              maxLength={5000}
              onChange={(e) => change({ id: selected.id, body: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span>Shows on</span>
            <select
              value={pinForm(selected)}
              onChange={(e) => change({ id: selected.id, form: e.target.value as PinForm })}
            >
              {(['finished', 'raw', 'both'] as const).map((f) => (
                <option key={f} value={f}>
                  {PIN_FORM_LABEL[f]}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.nudge} aria-label="Nudge pin">
            <button type="button" aria-label="Nudge up" onClick={() => nudge(0, -NUDGE_PX)}>
              ↑
            </button>
            <button type="button" aria-label="Nudge left" onClick={() => nudge(-NUDGE_PX, 0)}>
              ←
            </button>
            <button type="button" aria-label="Nudge right" onClick={() => nudge(NUDGE_PX, 0)}>
              →
            </button>
            <button type="button" aria-label="Nudge down" onClick={() => nudge(0, NUDGE_PX)}>
              ↓
            </button>
          </div>
          <div className={styles.sheetActions}>
            <button
              type="button"
              className={styles.sheetBtn}
              aria-pressed={moving}
              onClick={() => setMoving((m) => !m)}
            >
              {moving ? 'Cancel move' : 'Move'}
            </button>
            <button
              type="button"
              className={styles.sheetBtn}
              onClick={() =>
                void leaveTo(`/admin/${experienceId}?tab=pins&pin=${selected.id}`)
              }
            >
              Adjust in 3D
            </button>
            <button type="button" className={styles.sheetBtnDanger} onClick={removeSelected}>
              Delete
            </button>
          </div>
          <p className={styles.small} role="status">
            {moving
              ? 'Tap the model where the pin should go.'
              : (notice ?? 'Audio for pins is added from the studio on a computer.')}
          </p>
        </div>
      ) : (
        anchored &&
        modelsReady && (
          <div className={styles.footer}>
            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}
            {publishConflict ? (
              <button
                type="button"
                className={styles.toolBtn}
                disabled={saving}
                onClick={() => void reloadDraft()}
              >
                Load latest draft
              </button>
            ) : (
              savedOnce &&
              !pending && (
                <button
                  type="button"
                  className={styles.toolBtn}
                  disabled={saving}
                  onClick={() => void publish()}
                >
                  Publish
                </button>
              )
            )}
            {!notice && <p className={styles.hint}>{hint}</p>}
          </div>
        )
      )}

      {!stage && <p className={ar.attrib}>XR Engine by Niantic Spatial, Inc. © 2026</p>}
    </div>
  );
}
