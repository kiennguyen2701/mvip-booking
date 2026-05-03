'use client';
import Link from 'next/link';
import { useState } from 'react';
import { LogoutButton } from '@/components/logout-button';
export default function HeaderMobileMenu({
  isLoggedIn,
  role,
}: {
  isLoggedIn: boolean;
  role: string | null;
}) {
  const [open, setOpen] = useState(false);
  const isCustomer = role === 'customer';
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-black text-white"
        aria-label="Open menu"
      >
        ☰
      </button>
      {open && (
        <div className="absolute right-0 top-14 w-56 overflow-hidden rounded-3xl border border-white/10 bg-[#11100c] p-2 shadow-2xl shadow-black/60">
          {isLoggedIn ? (
            <>
              {!isCustomer && (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-sm font-black text-slate-200 hover:bg-white/10"
                >
                  Dashboard
                </Link>
              )}
              {isCustomer && (
                <Link
                  href="/dashboard/customer/profile"
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-sm font-black text-amber-300 hover:bg-amber-300/10"
                >
                  My Profile
                </Link>
              )}
              <div className="mt-2 border-t border-white/10 pt-2">
                <LogoutButton />
              </div>
            </>
          ) : (
            <Link
              href="/login?mode=register"
              onClick={() => setOpen(false)}
              className="block rounded-2xl bg-amber-300 px-4 py-3 text-center text-sm font-black text-slate-950"
            >
              Register
            </Link>
          )}
        </div>
      )}
    </div>
  );
}