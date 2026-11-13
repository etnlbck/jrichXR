import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { config } from '@/lib/config';
import styles from './marketing.module.css';

export const metadata: Metadata = {
  title: { absolute: 'TagXR' },
  description:
    'Web AR for Untitled No. 7, scan a marker, see the finished obsidian piece, tap to morph to the raw stone. No app install.',
};

function utmQuery(
  params: Record<string, string | string[] | undefined>
): string {
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
  const out = new URLSearchParams();
  for (const key of keys) {
    const value = params[key];
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw) out.set(key, raw);
  }
  const qs = out.toString();
  return qs ? `?${qs}` : '';
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if (query.stage === '1') {
    redirect('/try?stage=1');
  }

  const testHref = `/test${utmQuery(query)}`;
  const piece = config.piece;

  return (
    <main>
      <p className={styles.kicker}>{piece.title}</p>
      <h1 className={styles.title}>{piece.gateTitle}</h1>
      <p className={styles.lead}>
        Scan a marker beside the sculpture. The finished black-obsidian piece
        appears on your phone. Tap to morph to the raw, guide-marked stone while
        the artist narrates. No app install. Safari or Chrome is enough.
      </p>
      <ol className={styles.steps}>
        <li>
          <span className={styles.stepNum}>1</span>
          <span>Join the tester list with your email.</span>
        </li>
        <li>
          <span className={styles.stepNum}>2</span>
          <span>Print the image marker on matte paper.</span>
        </li>
        <li>
          <span className={styles.stepNum}>3</span>
          <span>Open the experience on your phone and aim at the marker.</span>
        </li>
      </ol>
      <div className={styles.actions}>
        <Link href={testHref} className={styles.primary}>
          Join the test
        </Link>
        <Link href="/try" className={styles.quiet}>
          Already joined? Open the experience
        </Link>
      </div>
    </main>
  );
}
