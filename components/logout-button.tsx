'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient();

      await supabase.auth.signOut();

      router.replace('/login');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-black text-white transition hover:bg-white hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Logging out...' : 'Log Out'}
    </button>
  );
}