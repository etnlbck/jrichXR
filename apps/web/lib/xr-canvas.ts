/**
 * Full-window camera canvas sizing, ported from XRExtras FullWindowCanvas.
 *
 * Copyright 2026 Niantic Spatial, Inc. MIT License: permission is hereby
 * granted, free of charge, to any person obtaining a copy of this software
 * to deal in the Software without restriction, subject to including this
 * notice. The Software is provided "as is", without warranty of any kind.
 *
 * Differences: the canvas stays where React rendered it (CSS already makes it
 * fixed and full-window), so it is never moved into <body>.
 */

type AttachArgs = {
  canvas: HTMLCanvasElement;
  orientation: number;
  videoWidth: number;
  videoHeight: number;
};

const BODY_RESET = { backgroundColor: 'initial', overflowY: 'initial' };

export function fullWindowCanvasModule() {
  let canvas: HTMLCanvasElement | null = null;
  let orientation = 0;
  const video = { w: 0, h: 0 };
  const savedBody = { ...BODY_RESET };
  let savedHtmlOverflow = 'initial';

  /** Phones rotate the page themselves; wait for the window to catch up. */
  function isRotatingPhone() {
    const XR8 = window.XR8;
    if (!XR8?.XrDevice || !XR8.XrConfig) return false;
    return (
      XR8.XrDevice.isDeviceBrowserCompatible({
        allowedDevices: XR8.XrConfig.device().MOBILE,
      }) && !XR8.XrDevice.deviceEstimate().model.toLowerCase().includes('ipad')
    );
  }

  function layout() {
    if (!canvas) return;
    const ww = window.innerWidth * devicePixelRatio;
    const wh = window.innerHeight * devicePixelRatio;
    const portrait = orientation === 0 || orientation === 180;
    if (((portrait && ww > wh) || (!portrait && wh > ww)) && isRotatingPhone()) {
      window.requestAnimationFrame(layout);
      return;
    }

    // Match the window's aspect, but never exceed the camera resolution.
    const winLong = Math.max(ww, wh);
    const winShort = Math.min(ww, wh);
    const aspect = winLong / winShort;
    const vidLong = Math.max(video.w, video.h);
    const vidShort = Math.min(video.w, video.h);
    let long = vidLong;
    let short = Math.round(vidLong / aspect);
    if (short > vidShort) {
      short = vidShort;
      long = Math.round(vidShort * aspect);
    }
    if (short > winShort || long > winLong) {
      short = winShort;
      long = winLong;
    }
    const landscape = ww > wh;
    canvas.width = landscape ? long : short;
    canvas.height = landscape ? short : long;
    // Nudges iOS Safari to collapse its toolbar after a resize.
    setTimeout(() => window.scrollTo(0, (window.scrollY + 1) % 2), 300);
  }

  function onResize() {
    if (!isRotatingPhone()) layout();
  }

  return {
    name: 'jrf-canvas',
    onAttach: ({ canvas: c, orientation: o, videoWidth, videoHeight }: AttachArgs) => {
      canvas = c;
      orientation = o;
      if (window.XR8?.XrDevice?.deviceEstimate().os === 'iOS') {
        const body = getComputedStyle(document.body);
        savedBody.backgroundColor = body.getPropertyValue('background-color');
        savedBody.overflowY = body.getPropertyValue('overflow-y');
        savedHtmlOverflow = getComputedStyle(document.documentElement).getPropertyValue(
          'overflow'
        );
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflowY = 'scroll';
      }
      window.addEventListener('resize', onResize);
      video.w = videoWidth;
      video.h = videoHeight;
      layout();
    },
    onDetach: () => {
      Object.assign(document.body.style, savedBody);
      document.documentElement.style.overflow = savedHtmlOverflow;
      window.removeEventListener('resize', onResize);
      canvas = null;
      orientation = 0;
      video.w = 0;
      video.h = 0;
    },
    onCameraStatusChange: ({
      status,
      video: v,
    }: {
      status: string;
      video?: { videoWidth: number; videoHeight: number };
    }) => {
      if (status === 'hasVideo' && v) {
        video.w = v.videoWidth;
        video.h = v.videoHeight;
      }
    },
    onVideoSizeChange: ({ videoWidth, videoHeight }: { videoWidth: number; videoHeight: number }) => {
      video.w = videoWidth;
      video.h = videoHeight;
      layout();
    },
    onDeviceOrientationChange: ({ orientation: o }: { orientation: number }) => {
      orientation = o;
      layout();
    },
    onCanvasSizeChange: () => layout(),
  };
}
