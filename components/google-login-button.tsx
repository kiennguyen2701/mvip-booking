'use client';

import { createClient } from '@/lib/supabase/client';

export function GoogleLoginButton() {
  const onLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
      }
    });
  };

  return (
    <button onClick={onLogin} className="w-full rounded-xl border px-4 py-3">
      Đăng nhập với Google
    </button>
  );
}