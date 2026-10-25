'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminUserMenu from '@/components/AdminUserMenu';
import styles from '@/app/admin/admin.module.css';

export default function AdminStudioNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const onUsers = pathname.startsWith('/admin/users');
  const onBrand = pathname.startsWith('/admin/brand');
  const onExperiences = !onUsers && !onBrand;

  return (
    <header className={styles.topBar}>
      <nav className={styles.topBarInner} aria-label="Studio">
        <Link href="/admin" className={styles.wordmark}>
          Studio
        </Link>
        <Link
          href="/admin"
          className={styles.topLink}
          aria-current={onExperiences ? 'page' : undefined}
        >
          Experiences
        </Link>
        <Link
          href="/admin/brand"
          className={styles.topLink}
          aria-current={onBrand ? 'page' : undefined}
        >
          Brand
        </Link>
        {isAdmin && (
          <Link
            href="/admin/users"
            className={styles.topLink}
            aria-current={onUsers ? 'page' : undefined}
          >
            Users
          </Link>
        )}
        <span className={styles.navEnd}>
          <AdminUserMenu />
        </span>
      </nav>
    </header>
  );
}
