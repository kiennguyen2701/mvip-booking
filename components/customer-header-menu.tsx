"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

export default function CustomerHeaderMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm font-black text-white shadow-xl shadow-black/20 transition hover:border-amber-300/50 hover:bg-amber-300 hover:text-slate-950"
        aria-label="Open customer menu"
        aria-expanded={open}
      >
        <span className="text-lg leading-none">☰</span>
        <span>Menu</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+12px)] z-[10000] w-[260px] overflow-hidden rounded-3xl border border-white/10 bg-[#11100c] p-2 text-white shadow-2xl shadow-black/80 ring-1 ring-amber-300/10">
          <Link
            href="/dashboard/customer"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block rounded-2xl px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/customer/bookings"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block rounded-2xl px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            My Bookings
          </Link>

          <Link
            href="/dashboard/customer/profile"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block rounded-2xl px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            My Profile
          </Link>

          <div className="mt-2 border-t border-white/10 p-2">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}