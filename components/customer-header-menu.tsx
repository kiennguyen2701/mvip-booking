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
        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-4 text-sm font-black text-white shadow-xl shadow-black/20 transition hover:border-amber-300/50 hover:bg-amber-300 hover:text-slate-950"
        aria-label="Open customer menu"
        aria-expanded={open}
      >
        <span className="text-base leading-none">☰</span>
        <span>Menu</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[10000] mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#11100c] p-1.5 text-white shadow-2xl shadow-black/70">
          <Link
            href="/dashboard/customer"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm font-bold leading-none text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/customer/bookings"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm font-bold leading-none text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            My Bookings
          </Link>

          <Link
            href="/dashboard/customer/profile"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm font-bold leading-none text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            My Profile
          </Link>

          <div className="my-1 border-t border-white/10" />

          <div className="[&_button]:w-full [&_button]:rounded-xl [&_button]:px-3 [&_button]:py-2.5 [&_button]:text-left [&_button]:text-sm [&_button]:font-bold [&_button]:leading-none">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}