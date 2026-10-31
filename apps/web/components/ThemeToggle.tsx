'use client';

import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

export const THEME_KEY = 'tagxr-theme';
type Theme = 'dark' | 'light';

/** Runs before first paint (inlined in <head>) so there is no flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function ThemeToggle({
  variant = 'plain',
}: {
  variant?: 'plain' | 'solid';
}) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={`${styles.toggle} ${variant === 'solid' ? styles.solid : ''}`}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          /* private mode: the choice just won't persist */
        }
        setTheme(next);
      }}
    >
      <i
        className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`}
        aria-hidden="true"
      />
    </button>
  );
}
