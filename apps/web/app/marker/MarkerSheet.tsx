import { brandStyle } from '@/lib/brand-style';
import type { AppConfig } from '@/lib/config';
import styles from './marker.module.css';

/**
 * Print this page (matte paper, full color) and mount beside the sculpture.
 * Use the cropped target art — not a phone screenshot of the AR view.
 */
export default function MarkerSheet({ config }: { config: AppConfig }) {
  const brand = config.brand;
  const widthCm = (config.physicalWidthM * 100).toFixed(1);

  return (
    <main className={styles.page} style={brandStyle(brand)}>
      <header className={styles.brandHeader}>
        {brand.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- artist upload on Blob
          <img className={styles.logo} src={brand.logoUrl} alt={brand.displayName ?? ''} />
        )}
        {brand.displayName && <p className={styles.artist}>{brand.displayName}</p>}
      </header>
      <h1>{config.piece.title} — image target</h1>
      <p>
        Print on <strong>matte</strong> paper. Avoid glossy laminate. Place
        beside the sculpture, then open the AR experience and aim here.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.marker}
        src={config.printImage}
        alt={`${config.piece.title} image target`}
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
        sculpture.
      </p>
    </main>
  );
}
