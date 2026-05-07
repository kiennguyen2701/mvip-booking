import Link from "next/link";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import HeaderMobileMenu from "@/components/header-mobile-menu";
import CustomerHeaderMenu from "@/components/customer-header-menu";

function getDashboardHref(role: string | null) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "supplier") return "/dashboard/supplier";
  if (role === "agent") return "/dashboard/agent";
  if (role === "customer") return "/dashboard/customer";
  return "/login";
}

function hasSupabaseAuthCookie(
  cookieList: Awaited<ReturnType<typeof cookies>>,
) {
  return cookieList
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        (cookie.name.includes("auth-token") ||
          cookie.name.includes("access-token") ||
          cookie.name.includes("refresh-token")),
    );
}

export default async function Header() {
  const cookieStore = await cookies();
  const hasAuthCookie = hasSupabaseAuthCookie(cookieStore);

  let user = null;
  let role: string | null = null;

  if (hasAuthCookie) {
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    user = authUser;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      role = profile?.role || user.user_metadata?.role || null;
    }
  }

  const dashboardHref = getDashboardHref(role);
  const isCustomer = role === "customer";

  return (
    <header className="sticky top-0 z-[9999] w-full max-w-[100vw] overflow-x-clip border-b border-white/10 bg-[#080704]/95 text-white shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex h-[92px] w-full max-w-7xl items-center justify-between gap-4 px-4 md:h-[96px] md:px-6">
        <Link
          href={dashboardHref}
          prefetch
          className="flex min-w-0 shrink-0 items-center gap-3 overflow-hidden md:w-[320px]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-xl text-slate-950 shadow-xl shadow-amber-950/20">
            ♛
          </div>

          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-xl font-black leading-tight text-white">
              Mvip Booking
            </p>
            <p className="truncate text-xs font-semibold text-slate-500">
              Premium booking platform
            </p>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-end gap-3 md:flex">
          {user ? (
            isCustomer ? (
              <CustomerHeaderMenu />
            ) : (
              <>
                <Link
                  href={dashboardHref}
                  prefetch
                  className="rounded-2xl px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Dashboard
                </Link>
                <LogoutButton />
              </>
            )
          ) : (
            <Link
              href="/login?mode=register"
              prefetch
              className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
            >
              Register
            </Link>
          )}
        </nav>

        {user && (
          <div className="shrink-0 md:hidden">
            <HeaderMobileMenu isLoggedIn={!!user} role={role} />
          </div>
        )}
      </div>
    </header>
  );
}