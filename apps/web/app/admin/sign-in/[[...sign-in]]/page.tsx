import { SignIn } from '@clerk/nextjs';
import styles from '../../admin.module.css';

export default function AdminSignInPage() {
  return (
    <div className={styles.page}>
      <div className={styles.loginBox}>
        <h1 className={styles.brand}>JRichForms</h1>
        <p className={styles.sub}>Artist studio — sign in to create artwork</p>
        <SignIn />
      </div>
    </div>
  );
}
