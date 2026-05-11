"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";

export default function SupplierHeaderMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-black text-white shadow-xl shadow-black/30 transition hover:border-amber-300/50 hover:bg-amber-300 hover:text-slate-950"
        aria-label="Open supplier menu"
      >
        ☰
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close supplier menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9998] cursor-default bg-transparent"
          />

          <div className="fixed right-6 top-[92px] z-[9999] w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#11100c] text-white shadow-2xl shadow-black/80 ring-1 ring-amber-300/10">
            <Link
              href="/dashboard/supplier"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="block whitespace-nowrap px-5 py-4 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/supplier/bookings"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="block whitespace-nowrap px-5 py-4 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Booking List
            </Link>

            <Link
              href="/dashboard/supplier/restaurants"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="block whitespace-nowrap px-5 py-4 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              My Restaurants
            </Link>

            <Link
              href="/dashboard/supplier/profile"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="block whitespace-nowrap px-5 py-4 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              My Profile
            </Link>

            <Link
              href="/dashboard/supplier/change-password"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="block whitespace-nowrap px-5 py-4 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Change Password
            </Link>

            <div className="border-t border-white/10 p-3">
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}