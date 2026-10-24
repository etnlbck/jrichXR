'use client';

import { useAuth, useSignIn } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import styles from '@/app/admin/admin.module.css';

type State =
  | { kind: 'working' }
  | { kind: 'failed'; message: string };

function go(next: string) {
  window.location.replace(next);
}

export default function HandoffSignIn({ next }: { next: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const [state, setState] = useState<State>({ kind: 'working' });
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    // Drop the token from the address bar and history straight away.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    void (async () => {
      if (isSignedIn) {
        go(next);
        return;
      }
      if (!token) {
        setState({
          kind: 'failed',
          message: 'This link is missing its sign-in code. Scan a fresh QR code from your computer.',
        });
        return;
      }
      const { error } = await signIn.ticket({ ticket: token });
      if (error) {
        setState({
          kind: 'failed',
          message:
            'This link has expired or was already used. Scan a fresh QR code from your computer.',
        });
        return;
      }
      const done = await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          go(decorateUrl(next));
        },
      });
      if (done.error) {
        setState({ kind: 'failed', message: done.error.message || 'Sign-in failed.' });
      }
    })();
  }, [isLoaded, isSignedIn, signIn, next]);

  if (state.kind === 'working') {
    return (
      <p className={styles.sub} role="status">
        Signing you in on this phone…
      </p>
    );
  }
  return (
    <>
      <p className={styles.error} role="alert">
        {state.message}
      </p>
      <p className={styles.sub}>
        Or{' '}
        <a href={`/admin/sign-in?redirect_url=${encodeURIComponent(next)}`}>
          sign in with your account
        </a>
        .
      </p>
    </>
  );
}
