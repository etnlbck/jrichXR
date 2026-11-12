import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site-url';
import ThanksClient from './ThanksClient';
import styles from '../marketing.module.css';

export const metadata: Metadata = {
  title: 'You are on the list',
  description:
    'Print the marker, open the experience on your phone, and tell us what happened.',
};

function first(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const testerId = first(query.id) ?? null;
  const emailed = first(query.emailed) !== '0';
  const tryUrl = `${getSiteUrl()}/try`;

  return (
    <main>
      <p className={styles.kicker}>Thank you</p>
      <h1 className={styles.title}>You are on the list</h1>
      <p className={styles.lead}>
        Next: print the marker on matte paper, open the experience on your phone,
        tap Begin, and aim at the marker. Tap the piece to morph to the raw stone.
      </p>
      <ThanksClient testerId={testerId} emailed={emailed} tryUrl={tryUrl} />
    </main>
  );
}
