"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  const dashboardHref = getDashboardHref(role);
  const isCustomer = role === "customer";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const menu = (
    <div className="fixed inset-0 z-[2147483647] bg-black/75 text-white backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0"
        onClick={() => setOpen(false)}
        aria-label="Close menu"
      />

      <aside className="absolute right-0 top-0 flex h-[100dvh] w-[88vw] max-w-[380px] flex-col bg-[#11100c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div className="min-w-0">
            <p className="truncate text-lg font-black">Mvip Booking</p>
            <p className="truncate text-xs font-semibold text-slate-500">
              Premium booking platform
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {isLoggedIn ? (
            <>
              <Link
                href={dashboardHref}
                onClick={() => setOpen(false)}
                className="block rounded-2xl bg-white/10 px-4 py-4 text-base font-black"
              >
                Dashboard
              </Link>

              {isCustomer && (
                <Link
                  href="/dashboard/customer/profile"
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl bg-amber-300 px-4 py-4 text-base font-black text-slate-950"
                >
                  My Profile
                </Link>
              )}

              <div className="rounded-2xl bg-red-500 text-center text-base font-black text-white">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-2xl bg-white/10 px-4 py-4 text-center text-base font-black"
              >
                Login
              </Link>

              <Link
                href="/login?mode=register"
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
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-black text-white"
        aria-label="Open menu"
      >
        ☰
      </button>

      {mounted && open ? createPortal(menu, document.body) : null}
    </>
  );
}