import type { Metadata } from 'next';
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
  return (
    <main className={styles.page}>
      <h1>JRichForms XR — image target</h1>
      <p>
        Print on <strong>matte</strong> paper (~15–20&nbsp;cm wide). Avoid glossy
        laminate. Place beside the sculpture, then open the AR experience and aim
        here.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.marker}
        src="/assets/targets/jrichforms-placard_cropped.png"
        alt="JRichForms XR image target"
      />
      <p className={styles.meta}>Target name: jrichforms-placard</p>
    </main>
  );
}
