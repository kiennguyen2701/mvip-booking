"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export default function CustomerHeaderMenu() {
  return (
    <div className="hidden items-center gap-3 md:flex">
      <Link
        href="/dashboard/customer"
        prefetch
        className="rounded-2xl px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        Dashboard
      </Link>

      <Link
        href="/dashboard/customer/bookings"
        prefetch
        className="rounded-2xl px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        My Bookings
      </Link>

      <Link
        href="/dashboard/customer/profile"
        prefetch
        className="rounded-2xl px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        My Profile
      </Link>

      <LogoutButton />
    </div>
  );
}