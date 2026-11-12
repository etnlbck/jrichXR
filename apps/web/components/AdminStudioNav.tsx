'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminTooltip from '@/components/AdminTooltip';
import AdminUserMenu from '@/components/AdminUserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import styles from '@/app/admin/admin.module.css';

export default function AdminStudioNav({
  isAdmin,
  bypass = false,
}: {
  isAdmin: boolean;
  bypass?: boolean;
}) {
  const pathname = usePathname();
  const onUsers = pathname.startsWith('/admin/users');
  const onBrand = pathname.startsWith('/admin/brand');
  const onTesters = pathname.startsWith('/admin/testers');
  const onExperiences = !onUsers && !onBrand && !onTesters;

  return (
    <header className={styles.topBar}>
      <nav className={styles.topBarInner} aria-label="Studio">
        <Link href="/admin" className={styles.wordmark}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`${styles.logo} ${styles.logoLight}`}
            src="/brand/tagxr-logo-color.svg"
            alt="TagXR"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`${styles.logo} ${styles.logoDark}`}
            src="/brand/tagxr-logo-white.svg"
            alt=""
            aria-hidden="true"
          />
          <span className={styles.studioTag}>Studio</span>
        </Link>
        <Link
          href="/admin"
          className={styles.topLink}
          aria-current={onExperiences ? 'page' : undefined}
        >
          Experiences
        </Link>
        <AdminTooltip
          about="Brand"
          label="Your artist profile: logo, accents, and how experiences look before overrides."
        >
          <Link
            href="/admin/testers"
            className={styles.topLink}
            aria-current={onTesters ? 'page' : undefined}
          >
            Testers
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin/users"
            className={styles.topLink}
            aria-current={onBrand ? 'page' : undefined}
          >
            Brand
          </Link>
        </AdminTooltip>
        {isAdmin && (
          <AdminTooltip
            about="Testers"
            label="Emails collected from the public /test signup page."
          >
            <Link
              href="/admin/testers"
              className={styles.topLink}
              aria-current={onTesters ? 'page' : undefined}
            >
              Testers
            </Link>
          </AdminTooltip>
        )}
        {isAdmin && (
          <AdminTooltip
            about="Users"
            label="Studio roles: who can create pieces and who administers the studio."
          >
            <Link
              href="/admin/users"
              className={styles.topLink}
              aria-current={onUsers ? 'page' : undefined}
            >
              Users
            </Link>
          </AdminTooltip>
        )}
        <span className={styles.navEnd}>
          <ThemeToggle />
          <AdminUserMenu bypass={bypass} />
        </span>
      </nav>
    </header>
  );
}
