'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/admin/admin.module.css';

type Role = 'admin' | 'artist' | null;

type StudioUser = {
  id: string;
  email: string | null;
  name: string | null;
  imageUrl: string;
  role: Role;
  isEnvAdmin: boolean;
  lastSignInAt: number | null;
};

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'artist', label: 'Artist' },
  { value: '', label: 'No role' },
];

const ERRORS: Record<string, string> = {
  cannot_demote_self: 'You cannot remove your own admin role.',
  invalid_role: 'That role is not valid.',
  not_found: 'That user no longer exists.',
  forbidden: 'Only studio admins can change roles.',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<StudioUser[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/users')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(ERRORS[data.error] ?? data.error ?? 'Load failed');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setUsers(data.users);
        setCurrentUserId(data.currentUserId);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(user: StudioUser) {
    const value = drafts[user.id] ?? user.role ?? '';
    const role: Role = value === '' ? null : (value as Role);
    setSavingId(user.id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(ERRORS[data.error] ?? data.error ?? 'Save failed');
      setUsers((prev) =>
        prev ? prev.map((u) => (u.id === user.id ? data.user : u)) : prev
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      setMessage(`Updated ${user.email ?? user.name ?? user.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className={styles.shell}>
      <h1 className={styles.brand}>Users</h1>
      <p className={styles.sub}>
        Studio roles. Admins see every piece and can manage roles; artists can
        use the studio when access is allowlisted.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && <p className={styles.ok}>{message}</p>}

      <section className={styles.panel}>
        {users === null && !error && <p className={styles.status}>Loading…</p>}
        {users?.length === 0 && <p className={styles.status}>No users yet.</p>}
        {users?.map((user) => {
          const isSelf = user.id === currentUserId;
          const value = drafts[user.id] ?? user.role ?? '';
          const dirty = value !== (user.role ?? '');
          return (
            <div key={user.id} className={styles.listRow}>
              <div className={styles.userCell}>
                <img
                  src={user.imageUrl}
                  alt=""
                  width={32}
                  height={32}
                  className={styles.userAvatar}
                />
                <div className={styles.userText}>
                  <strong>
                    {user.name || user.email || user.id}
                    {isSelf ? ' (you)' : ''}
                  </strong>
                  {user.email && user.name ? <span>{user.email}</span> : null}
                  {user.isEnvAdmin ? (
                    <span>Admin via CLERK_ADMIN_USER_IDS</span>
                  ) : null}
                </div>
              </div>
              <div className={styles.listRowActions}>
                <select
                  className={styles.roleSelect}
                  aria-label={`Role for ${user.email ?? user.id}`}
                  value={value}
                  disabled={savingId !== null || isSelf}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))
                  }
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={!dirty || savingId !== null || isSelf}
                  onClick={() => void save(user)}
                >
                  {savingId === user.id ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
