import Link from 'next/link';
import styles from './marketing.module.css';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.wordmarkLogo}
            src="/brand/tagxr-logo-white-notm.svg"
            alt="TagXR"
          />
        </Link>
        <Link href="/test" className={styles.navCta}>
          Join the test
        </Link>
      </header>
      <div className={styles.main}>{children}</div>
      <footer className={styles.footer}>
        <Link href="/shop">Shop</Link>
        <Link href="/try">Open the experience</Link>
        <Link href="/marker">Print marker</Link>
      </footer>
    </div>
  );
}
