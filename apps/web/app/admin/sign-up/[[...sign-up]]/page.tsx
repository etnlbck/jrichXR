import { SignUp } from '@clerk/nextjs';
import styles from '../../admin.module.css';

export default function AdminSignUpPage() {
  return (
    <div className={styles.page}>
      <div className={styles.loginBox}>
        <h1 className={styles.brand}>JRichForms</h1>
        <p className={styles.sub}>Artist studio — create an account</p>
        <SignUp />
      </div>
    </div>
  );
}
