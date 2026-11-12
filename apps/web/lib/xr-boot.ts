import * as THREE from 'three';
import type { AppConfig } from './config';
import { mark, metricsStart } from './metrics';
import type { createScene } from './scene';
import type { ImageTargetData, XR8Api } from './types';
import { fullWindowCanvasModule } from './xr-canvas';

function loadScript(src: string, attrs: Record<string, string> = {}) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-jrf-src="${src}"]`
    );
    if (existing) {
      if (existing.dataset.loaded === '1') resolve();
      else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error(`Failed to load ${src}`)),
          { once: true }
        );
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.jrfSrc = src;
    for (const [k, v] of Object.entries(attrs)) {
      script.setAttribute(k, v);
    }
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function waitForXr8(timeoutMs = 30000) {
  return new Promise<XR8Api>((resolve, reject) => {
    if (window.XR8) {
      resolve(window.XR8);
      return;
    }
    const timer = window.setTimeout(() => {
      reject(new Error('Timed out waiting for XR8 engine'));
    }, timeoutMs);
    window.addEventListener(
      'xrloaded',
      () => {
        window.clearTimeout(timer);
        if (window.XR8) resolve(window.XR8);
        else reject(new Error('xrloaded fired but window.XR8 is missing'));
      },
      { once: true }
    );
  });
}

export async function loadEngineScripts(config: AppConfig) {
  metricsStart('ar');
  // Provide THREE before pipeline modules that may reference the global.
  window.THREE = THREE;

  // Image targets with the distributed binary require the slam chunk.
  await loadScript(config.engine.xrScript, {
    'data-preload-chunks': config.engine.preloadChunks,
  });
  mark('engine_script_loaded');
  const XR8 = await waitForXr8();
  mark('xr8_ready');
  return XR8;
}

export async function fetchImageTargetData(
  config: AppConfig
): Promise<ImageTargetData> {
  const res = await fetch(config.imageTargetJson);
  if (!res.ok) {
    throw new Error(
      `Image target JSON missing (${res.status}): ${config.imageTargetJson}`
    );
  }
  const data = (await res.json()) as ImageTargetData;
  mark('image_target_json_loaded');
  return data;
}

/** What went wrong, in terms a visitor can act on. */
export type XrIssue = 'camera' | 'motion' | 'unsupported' | 'generic';

export type CameraStatus = 'requesting' | 'hasVideo';

export type BootOptions = {
  canvas: HTMLCanvasElement;
  scene: ReturnType<typeof createScene>;
  config: AppConfig;
  /** Pending result of `requestMotionPermission()`, started in the tap. */
  motion?: Promise<boolean>;
  onStatus?: (status: CameraStatus) => void;
  onError: (issue: XrIssue) => void;
};

type MotionEventClass = { requestPermission?: () => Promise<string> };

/**
 * iOS only grants motion sensors during a user gesture, and by the time
 * XR8.run asks, the gesture has expired behind our awaits. Call this first
 * thing in the tap handler, before any await, so the engine's own request
 * succeeds immediately and its built-in prompt never appears.
 */
export function requestMotionPermission(): Promise<boolean> {
  const classes = [
    typeof DeviceMotionEvent === 'undefined' ? undefined : DeviceMotionEvent,
    typeof DeviceOrientationEvent === 'undefined' ? undefined : DeviceOrientationEvent,
  ] as (MotionEventClass | undefined)[];
  const asks = classes
    .filter((c) => typeof c?.requestPermission === 'function')
    .map((c) => c!.requestPermission!().catch(() => 'denied'));
  if (asks.length === 0) return Promise.resolve(true);
  return Promise.all(asks).then((results) => results.every((r) => r === 'granted'));
}

function issueFromException(err: unknown): XrIssue {
  const e = err as { type?: string; permission?: string } | null;
  if (e?.type === 'permission') {
    return e.permission === 'camera' ? 'camera' : 'motion';
  }
  return 'generic';
}

/**
 * Configure image-target-only tracking and start the camera pipeline.
 * Must run inside a user-gesture handler on iOS.
 */
export async function bootXr({
  canvas,
  scene,
  config,
  motion,
  onStatus,
  onError,
}: BootOptions) {
  try {
    if (motion && !(await motion)) {
      onError('motion');
      return;
    }
    const XR8 = window.XR8 ?? (await loadEngineScripts(config));
    const allowedDevices = XR8.XrConfig?.device()?.ANY;
    if (XR8.XrDevice && !XR8.XrDevice.isDeviceBrowserCompatible({ allowedDevices })) {
      console.error(
        '[jrf] browser incompatible with XR:',
        XR8.XrDevice.incompatibleReasons({ allowedDevices })
      );
      onError('unsupported');
      return;
    }
    const target = await fetchImageTargetData(config);

    // disableWorldTracking MUST be set before pipelineModule() and run().
    XR8.XrController.configure({
      disableWorldTracking: true,
      imageTargetData: [target],
    });
    mark('xr_configured');

    const modules: unknown[] = [
      XR8.GlTextureRenderer.pipelineModule(),
      XR8.Threejs.pipelineModule(),
      XR8.XrController.pipelineModule(),
    ];

    let failed = false;
    const fail = (issue: XrIssue) => {
      if (failed) return;
      failed = true;
      try {
        XR8.stop();
      } catch {
        /* already stopped */
      }
      onError(issue);
    };
    modules.push(fullWindowCanvasModule());
    modules.push({
      name: 'jrf-status',
      onCameraStatusChange: ({ status, reason }: { status: string; reason?: string }) => {
        if (status === 'requesting' || status === 'hasVideo') onStatus?.(status);
        else if (status === 'failed') {
          console.error('[jrf] camera failed:', reason);
          fail('camera');
        }
      },
      onException: (err: unknown) => {
        console.error('[jrf] XR exception:', err);
        fail(issueFromException(err));
      },
    });

    modules.push(scene.pipelineModule());
    modules.push({
      name: 'jrf-image-target',
      listeners: [
        {
          event: 'reality.imagefound',
          process: ({ detail }: { detail: Parameters<typeof scene.onImageFound>[0] }) =>
            scene.onImageFound(detail),
        },
        {
          event: 'reality.imageupdated',
          process: ({
            detail,
          }: {
            detail: Parameters<typeof scene.onImageUpdated>[0];
          }) => scene.onImageUpdated(detail),
        },
        {
          event: 'reality.imagelost',
          process: ({ detail }: { detail?: { name?: string } }) =>
            scene.onImageLost(detail),
        },
      ],
    });

    XR8.addCameraPipelineModules(modules);

    XR8.run(
      allowedDevices
        ? { canvas, allowedDevices }
        : { canvas }
    );
    mark('xr_run');
  } catch (err) {
    console.error('[jrf] AR failed to start:', err);
    onError(issueFromException(err));
  }
}
