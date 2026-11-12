'use client';

import { useState } from 'react';
import type { XrIssue } from '@/lib/xr-boot';
import styles from './XrIssueSheet.module.css';

type Platform = 'ios' | 'android' | 'other';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function cameraSteps(platform: Platform, host: string) {
  if (platform === 'ios') {
    return `Tap aA in the address bar, then Website Settings → Camera → Allow.`;
  }
  if (platform === 'android') {
    return `Tap the icon to the left of ${host}, then Permissions → Camera → Allow.`;
  }
  return `Allow camera access for ${host} in your browser's site settings.`;
}

function motionSteps(platform: Platform) {
  if (platform === 'ios') {
    return 'Tap aA in the address bar, then Website Settings → Motion & Orientation Access → Allow.';
  }
  return "Allow motion sensors for this site in your browser's settings.";
}

/** Plain-language replacement for the engine's permission and error screens. */
export default function XrIssueSheet({ issue }: { issue: XrIssue }) {
  const [copied, setCopied] = useState(false);
  const platform = detectPlatform();
  const host = window.location.host;

  const retry = (
    <button type="button" className={styles.primary} onClick={() => window.location.reload()}>
      Try again
    </button>
  );

  let title: string;
  let body: string;
  let action = retry;
  switch (issue) {
    case 'camera':
      title = 'Camera access is blocked';
      body = `The experience appears through your camera. ${cameraSteps(platform, host)} Nothing is recorded.`;
      break;
    case 'motion':
      title = 'Motion access is needed';
      body = `Motion sensors keep the experience in place as you move. ${motionSteps(platform)}`;
      break;
    case 'unsupported':
      title = 'Open this page in your browser';
      body =
        'AR needs Safari on iPhone or Chrome on Android. If you opened this link inside another app, use its menu to open it in your browser, or copy the link.';
      action = (
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            void navigator.clipboard
              ?.writeText(window.location.href)
              .then(() => setCopied(true))
              .catch(() => {});
          }}
        >
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      );
      break;
    default:
      title = 'Something went wrong starting AR';
      body = 'Check your connection and try again.';
  }

  return (
    <div className={styles.sheet} role="alert">
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}
