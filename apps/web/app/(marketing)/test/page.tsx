import type { Metadata } from 'next';
import TesterSignupForm from './TesterSignupForm';
import styles from '../marketing.module.css';

export const metadata: Metadata = {
  title: 'Join the test',
  description:
    'Join the TagXR tester list. We email the marker and experience links so you can try Untitled No. 7 on your phone.',
};

function first(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function TestLandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;

  return (
    <main>
      <p className={styles.kicker}>Early access</p>
      <h1 className={styles.title}>Join the Untitled No. 7 test</h1>
      <p className={styles.lead}>
        We are inviting a small group to try the WebAR experience before a wider
        release. You will get an email with the printable marker and a link to
        open the piece on your phone.
      </p>
      <div className={styles.card}>
        <p>
          <strong>What you need:</strong> an iPhone with Safari, or Android with
          Chrome; a camera; and a few minutes to print the marker after you join.
        </p>
        <p>
          Point your phone at the marker beside a printout (or the sculpture when
          you have access). The finished form appears, then tap to morph to the
          raw stone.
        </p>
      </div>
      <TesterSignupForm
        utmSource={first(query.utm_source)}
        utmMedium={first(query.utm_medium)}
        utmCampaign={first(query.utm_campaign)}
        utmContent={first(query.utm_content)}
      />
    </main>
  );
}
