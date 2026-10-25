'use client';

import { UserButton } from '@clerk/nextjs';

export default function AdminUserMenu({ bypass = false }: { bypass?: boolean }) {
  if (bypass) {
    return (
      <span title="CLERK_BYPASS=1 — local admin, no sign-in">Dev bypass</span>
    );
  }
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: { width: '1.75rem', height: '1.75rem' },
        },
      }}
    />
  );
}
