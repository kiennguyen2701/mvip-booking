"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

function getDashboardHref(role: string | null) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "supplier") return "/dashboard/supplier";
  if (role === "agent") return "/dashboard/agent";
  if (role === "customer") return "/dashboard/customer";
  return "/login";
}

export default function HeaderMobileMenu({
  isLoggedIn,
  role,
}: {
  isLoggedIn: boolean;
  role: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const dashboardHref = getDashboardHref(role);
  const isCustomer = role === "customer";
  const isSupplier = role === "supplier";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";
      return;
    }

    document.body.classList.add("menu-open");
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const menu = (
    <div className="fixed inset-0 z-[2147483647] w-full max-w-full overflow-hidden bg-black/75 text-white backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0"
        onClick={() => setOpen(false)}
        aria-label="Close menu"
      />

      <aside className="absolute right-0 top-0 flex h-[100dvh] w-[88dvw] max-w-[380px] flex-col overflow-hidden bg-[#11100c] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-lg font-black">Mvip Booking</p>
            <p className="truncate text-xs font-semibold text-slate-500">
              Premium booking platform
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-5 py-5">
          {isLoggedIn ? (
            <>
              <Link
                href={dashboardHref}
                prefetch={false}
                onClick={() => setOpen(false)}
                className="block rounded-2xl bg-white/10 px-4 py-4 text-base font-black"
              >
                Dashboard
              </Link>

              {isCustomer && (
                <>
                  <Link
                    href="/dashboard/customer/bookings"
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-white/10 px-4 py-4 text-base font-black"
                  >
                    My Bookings
                  </Link>

                  <Link
                    href="/dashboard/customer/profile"
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-amber-300 px-4 py-4 text-base font-black text-slate-950"
                  >
                    My Profile
                  </Link>
                </>
              )}

              {isSupplier && (
                <>
                  <Link
                    href="/dashboard/supplier/bookings"
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-white/10 px-4 py-4 text-base font-black"
                  >
                    Booking List
                  </Link>

                  <Link
                    href="/dashboard/supplier/restaurants"
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-white/10 px-4 py-4 text-base font-black"
                  >
                    My Restaurants
                  </Link>

                  <Link
                    href="/dashboard/supplier/profile"
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-amber-300 px-4 py-4 text-base font-black text-slate-950"
                  >
                    My Profile
                  </Link>

                  <Link
                    href="/dashboard/supplier/change-password"
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-white/10 px-4 py-4 text-base font-black"
                  >
                    Change Password
                  </Link>
                </>
              )}

              <div className="rounded-2xl bg-red-500 text-center text-base font-black text-white">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                prefetch={false}
                onClick={() => setOpen(false)}
                className="block rounded-2xl bg-white/10 px-4 py-4 text-center text-base font-black"
              >
                Login
              </Link>

              <Link
                href="/login?mode=register"
                prefetch={false}
                onClick={() => setOpen(false)}
                className="block rounded-2xl bg-amber-300 px-4 py-4 text-center text-base font-black text-slate-950"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-black text-white"
        aria-label="Open menu"
        aria-expanded={open}
      >
        ☰
      </button>

      {mounted && open ? createPortal(menu, document.body) : null}
    </>
  );
}