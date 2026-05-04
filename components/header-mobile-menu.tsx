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
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* BUTTON */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl text-white"
      >
        ☰
      </button>

      {/* OVERLAY */}
      {open && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm">
          {/* CLICK OUTSIDE */}
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />

          {/* PANEL */}
          <div className="absolute right-0 top-0 h-[100dvh] w-[85%] max-w-[360px] bg-[#11100c] shadow-2xl flex flex-col">
            
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div>
                <p className="font-bold text-white">Mvip Booking</p>
                <p className="text-xs text-slate-500">
                  Premium booking platform
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-xl bg-white/10 text-white text-lg"
              >
                ×
              </button>
            </div>

            {/* CONTENT (SCROLL) */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href={dashboardHref}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
                  >
                    Dashboard
                  </Link>

                  {isCustomer && (
                    <Link
                      href="/dashboard/customer/profile"
                      onClick={() => setOpen(false)}
                      className="block rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-black"
                    >
                      My Profile
                    </Link>
                  )}

                  {/* 👇 FIX QUAN TRỌNG */}
                  <div className="pt-2">
                    <LogoutButton />
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-bold text-white"
                  >
                    Login
                  </Link>

                  <Link
                    href="/login?mode=register"
                    onClick={() => setOpen(false)}
                    className="block rounded-xl bg-amber-300 px-4 py-3 text-center text-sm font-bold text-black"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}