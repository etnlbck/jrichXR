export type UiState =
  | 'START'
  | 'SCANNING'
  | 'ANCHORED'
  | 'RAW'
  | 'FINISHED'
  | 'ERROR';

export type ImageTargetData = {
  imagePath: string;
  name: string;
  type: 'PLANAR' | 'CYLINDER' | 'CONICAL';
  properties: Record<string, unknown>;
  resources?: Record<string, string>;
  metadata?: unknown;
  created?: number;
  updated?: number;
};

export type ImageTargetDetail = {
  name: string;
  position: { x: number; y: number; z: number; copy?: (v: unknown) => void };
  rotation: { x: number; y: number; z: number; w: number; copy?: (v: unknown) => void };
  scale?: number;
};

declare global {
  interface Window {
    XR8?: XR8Api;
    XRExtras?: XRExtrasApi;
    LandingPage?: { pipelineModule: () => unknown };
    THREE?: typeof import('three');
  }
}

export type XR8Api = {
  run: (opts: { canvas: HTMLCanvasElement; allowedDevices?: unknown }) => void;
  pause: () => void;
  stop: () => void;
  loadChunk?: (name: string) => Promise<void>;
  addCameraPipelineModules: (modules: unknown[]) => void;
  GlTextureRenderer: { pipelineModule: () => unknown };
  Threejs: {
    pipelineModule: () => unknown;
    xrScene: () => {
      scene: import('three').Scene;
      camera: import('three').Camera;
      renderer: import('three').WebGLRenderer;
    };
  };
  XrController: {
    configure: (opts: {
      disableWorldTracking?: boolean;
      imageTargetData?: ImageTargetData[];
      imageTargets?: string[];
      scale?: string;
    }) => void;
    pipelineModule: () => unknown;
    updateCameraProjectionMatrix: (opts: {
      origin: import('three').Vector3;
      facing: import('three').Quaternion;
    }) => void;
  };
  XrConfig?: { device: () => { ANY: unknown } };
};

export type XRExtrasApi = {
  FullWindowCanvas: { pipelineModule: () => unknown };
  Loading: {
    pipelineModule: () => unknown;
    showLoading?: (opts: { onxrloaded: () => void }) => void;
  };
  RuntimeError: { pipelineModule: () => unknown };
  AlmostThere?: { pipelineModule: () => unknown };
};
