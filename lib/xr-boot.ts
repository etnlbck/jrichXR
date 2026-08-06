import * as THREE from 'three';
import { config } from './config';
import { mark, metricsStart } from './metrics';
import type { createScene } from './scene';
import type { ImageTargetData, XR8Api } from './types';

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

export async function loadEngineScripts() {
  metricsStart('ar');
  // Provide THREE before pipeline modules that may reference the global.
  window.THREE = THREE;

  await loadScript(config.engine.xrextrasScript);
  mark('xrextras_loaded');
  await loadScript(config.engine.landingPageScript);
  mark('landing_loaded');
  // Image targets with the distributed binary require the slam chunk.
  await loadScript(config.engine.xrScript, {
    'data-preload-chunks': config.engine.preloadChunks,
  });
  mark('engine_script_loaded');
  const XR8 = await waitForXr8();
  mark('xr8_ready');
  return XR8;
}

export async function fetchImageTargetData(): Promise<ImageTargetData> {
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

export type BootOptions = {
  canvas: HTMLCanvasElement;
  scene: ReturnType<typeof createScene>;
  onError: (message: string) => void;
};

/**
 * Configure image-target-only tracking and start the camera pipeline.
 * Must run inside a user-gesture handler on iOS.
 */
export async function bootXr({ canvas, scene, onError }: BootOptions) {
  try {
    const XR8 = window.XR8 ?? (await loadEngineScripts());
    const target = await fetchImageTargetData();

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

    if (window.LandingPage?.pipelineModule) {
      modules.push(window.LandingPage.pipelineModule());
    }
    if (window.XRExtras) {
      modules.push(window.XRExtras.FullWindowCanvas.pipelineModule());
      modules.push(window.XRExtras.Loading.pipelineModule());
      modules.push(window.XRExtras.RuntimeError.pipelineModule());
    }

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
          process: () => scene.onImageLost(),
        },
      ],
    });

    XR8.addCameraPipelineModules(modules);

    const allowedDevices = XR8.XrConfig?.device()?.ANY;
    XR8.run(
      allowedDevices
        ? { canvas, allowedDevices }
        : { canvas }
    );
    mark('xr_run');
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to start AR experience';
    onError(message);
  }
}
