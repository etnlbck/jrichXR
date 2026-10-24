import HandoffSignIn from '@/components/HandoffSignIn';
import { safeAdminNext } from '@/lib/handoff';
import styles from '../admin.module.css';

export default async function AdminHandoffPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return (
    <div className={styles.page}>
      <div className={styles.loginBox}>
        <h1 className={styles.brand}>JRichForms</h1>
        <HandoffSignIn next={safeAdminNext(Array.isArray(next) ? next[0] : next)} />
      </div>
    </div>
  );
}
