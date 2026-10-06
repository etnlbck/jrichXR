import type { Metadata } from 'next';
import { config } from '@/lib/config';
import styles from './marker.module.css';

export const metadata: Metadata = {
  title: 'Print marker — JRichForms XR',
  description: 'Printable image target for the JRichForms XR POC',
};

/**
 * Print this page (matte paper, full color) and mount beside the sculpture.
 * Use the cropped target art — not a phone screenshot of the AR view.
 */
export default function MarkerPrintPage() {
  const widthCm = (config.physicalWidthM * 100).toFixed(1);

  return (
    <main className={styles.page}>
      <h1>JRichForms XR — image target</h1>
      <p>
        Print on <strong>matte</strong> paper. Avoid glossy laminate. Place
        beside the sculpture, then open the AR experience and aim here.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.marker}
        src={config.printImage}
        alt="JRichForms XR image target"
      />
      <p className={styles.meta}>
        Target: {config.imageTargetName}
        <br />
        Configured width: {widthCm}&nbsp;cm ({config.physicalWidthM}&nbsp;m) —
        measure the print and update{' '}
        <code>marker.physicalWidthM</code> in the experience package if different.
      </p>
      <p className={styles.scaleHint}>
        Scale check: after printing, measure edge-to-edge of this image, set
        physicalWidthM = cm÷100, then compare the AR model to a ruler beside the
        sculpture. See content/untitled-no-7/PHASE2.md.
      </p>
    </main>
  );
}
