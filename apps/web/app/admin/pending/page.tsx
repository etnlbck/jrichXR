import AdminUserMenu from '@/components/AdminUserMenu';
import styles from '../admin.module.css';

export default function AdminPendingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.loginBox}>
        <h1 className={styles.brand}>Waiting for approval</h1>
        <p className={styles.sub}>
          Your account is signed in, but this studio is allowlisted. An admin
          needs to mark you as an artist in Clerk before you can create
          artwork.
        </p>
        <nav className={styles.nav}>
          <AdminUserMenu />
        </nav>
      </div>
    </div>
  );
}
