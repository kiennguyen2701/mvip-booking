import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import HeaderMobileMenu from "@/components/header-mobile-menu";

function getDashboardHref(role: string | null) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "supplier") return "/dashboard/supplier";
  if (role === "agent") return "/dashboard/agent";
  if (role === "customer") return "/dashboard/customer";
  return "/login";
}

export default async function Header() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    role = profile?.role || user.user_metadata?.role || null;
  }

  const isCustomer = role === "customer";
  const dashboardHref = getDashboardHref(role);

  return (
    <header className="sticky top-0 z-50 w-full max-w-[100vw] border-b border-white/10 bg-[#080704]/95 text-white shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 overflow-hidden px-4 py-3 md:px-6 md:py-4">
        <Link href={dashboardHref} prefetch className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950">
            ♛
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white md:text-xl">
              Mvip Booking
            </p>
            <p className="truncate text-xs font-medium text-slate-500">
              Premium booking platform
            </p>
          </div>
        </Link>

        <nav className="hidden shrink-0 items-center gap-3 md:flex">
          {user ? (
            <>
              {!isCustomer && (
                <Link href={dashboardHref} prefetch className="rounded-2xl px-4 py-2 text-sm font-black text-slate-300 hover:bg-white/10">
                  Dashboard
                </Link>
              )}

              {isCustomer && (
                <Link href="/dashboard/customer/profile" prefetch className="rounded-2xl border border-amber-300/40 px-4 py-2 text-sm font-black text-amber-200">
                  My Profile
                </Link>
              )}

              <LogoutButton />
            </>
          ) : (
            <Link href="/login?mode=register" prefetch className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">
              Register
            </Link>
          )}
        </nav>

        <div className="shrink-0 md:hidden">
          <HeaderMobileMenu isLoggedIn={!!user} role={role} />
        </div>
      </div>
    </header>
  );
}