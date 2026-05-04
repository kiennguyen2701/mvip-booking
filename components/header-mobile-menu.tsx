"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const isCustomer = role === "customer";
  const dashboardHref = getDashboardHref(role);

  useEffect(() => {
    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflowX = "hidden";

    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.overflowX = "hidden";
      document.documentElement.style.overflowX = "hidden";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-black text-white"
        aria-label="Open menu"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-[999] w-screen max-w-[100vw] overflow-hidden bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />

          <aside className="absolute right-3 top-3 w-[calc(100vw-24px)] max-w-[340px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#11100c] p-3 text-white shadow-2xl shadow-black/70">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="min-w-0">
                <p className="truncate text-base font-black">Mvip Booking</p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  Premium booking platform
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-black"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              {isLoggedIn ? (
                <>
                  <Link
                    href={dashboardHref}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-100"
                  >
                    Dashboard
                  </Link>

                  {isCustomer && (
                    <Link
                      href="/dashboard/customer/profile"
                      onClick={() => setOpen(false)}
                      className="block rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950"
                    >
                      My Profile
                    </Link>
                  )}

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                    <LogoutButton />
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-white/[0.06] px-4 py-3 text-center text-sm font-black text-slate-100"
                  >
                    Login
                  </Link>

                  <Link
                    href="/login?mode=register"
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-amber-300 px-4 py-3 text-center text-sm font-black text-slate-950"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}