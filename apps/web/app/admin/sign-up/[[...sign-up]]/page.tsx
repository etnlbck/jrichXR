import { SignUp } from '@clerk/nextjs';
import styles from '../../admin.module.css';

export default function AdminSignUpPage() {
  return (
    <div className={styles.page}>
      <div className={styles.loginRule} aria-hidden="true" />
      <div className={styles.loginBox}>
        <h1 className={styles.loginLogoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`${styles.loginLogo} ${styles.logoLight}`}
            src="/brand/tagxr-logo-color.svg"
            alt="TagXR"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`${styles.loginLogo} ${styles.logoDark}`}
            src="/brand/tagxr-logo-white.svg"
            alt=""
            aria-hidden="true"
          />
        </h1>
        <p className={styles.sub}>Artist studio, create an account</p>
        <SignUp />
      </div>
    </div>
  );
}
