'use client';

import { UserButton } from '@clerk/nextjs';

export default function AdminUserMenu() {
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
