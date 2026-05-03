import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/logout-button';

export default async function Header() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    role = profile?.role || user.user_metadata?.role || null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080704]/90 text-white shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 shadow-lg shadow-amber-900/20 transition group-hover:-translate-y-0.5">
            ♛
          </div>

          <div>
            <p className="text-xl font-black tracking-tight text-white">
              Mvip Booking
            </p>
            <p className="text-xs font-medium text-slate-500">
              Premium booking platform
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-2xl px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Dashboard
              </Link>

              {role === 'customer' && (
                <Link
                  href="/dashboard/customer/profile"
                  className="rounded-2xl border border-amber-300/40 px-4 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-300 hover:text-slate-950"
                >
                  My Profile
                </Link>
              )}

              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login?mode=register"
              className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-200"
            >
              Register
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}