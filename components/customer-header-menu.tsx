"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogoutButton } from "@/components/logout-button";

export default function CustomerHeaderMenu() {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const [position, setPosition] = useState({
    top: 72,
    left: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      setPosition({
        top: rect.bottom + 12,
        left: Math.max(12, rect.right - 240),
      });
    }

    setOpen(true);
  }

  const menu = (
    <div
      className="fixed z-[2147483647] w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#11100c] text-white shadow-2xl shadow-black/80 ring-1 ring-amber-300/10"
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/dashboard/customer"
        prefetch
        className="block px-4 py-3 text-sm font-black text-slate-200 hover:bg-white/10"
      >
        Dashboard
      </Link>

      <Link
        href="/dashboard/customer/bookings"
        prefetch
        className="block px-4 py-3 text-sm font-black text-slate-200 hover:bg-white/10"
      >
        My Bookings
      </Link>

      <Link
        href="/dashboard/customer/profile"
        prefetch
        className="block px-4 py-3 text-sm font-black text-slate-200 hover:bg-white/10"
      >
        My Profile
      </Link>

      <div className="border-t border-white/10 p-2">
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP MENU */}
      <div className="hidden items-center gap-2 md:flex">
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

        <button
          ref={buttonRef}
          type="button"
          onMouseEnter={openMenu}
          onClick={() => (open ? setOpen(false) : openMenu())}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-black text-white shadow-xl shadow-black/30 transition hover:border-amber-300/50 hover:bg-amber-300 hover:text-slate-950"
          aria-label="Open customer menu"
        >
          ☰
        </button>
      </div>

      {/* MOBILE MENU */}
      <div className="md:hidden">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openMenu())}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-black text-white shadow-xl shadow-black/30 transition hover:border-amber-300/50 hover:bg-amber-300 hover:text-slate-950"
          aria-label="Open customer menu"
        >
          ☰
        </button>
      </div>

      {mounted && open ? createPortal(menu, document.body) : null}
    </>
  );
}