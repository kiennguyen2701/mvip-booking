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
      if (event.key === "Escape") {
        setOpen(false);
      }
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
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-black text-white shadow-xl shadow-black/30 transition hover:border-amber-300/50 hover:bg-amber-300 hover:text-slate-950"
        aria-label="Open customer menu"
        aria-expanded={open}
      >
        ☰
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[10000] mt-3 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#11100c] text-white shadow-2xl shadow-black/80 ring-1 ring-amber-300/10">
          <Link
            href="/dashboard/customer"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block whitespace-nowrap px-5 py-4 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/customer/bookings"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block whitespace-nowrap px-5 py-4 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            My Bookings
          </Link>

          <Link
            href="/dashboard/customer/profile"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block whitespace-nowrap px-5 py-4 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            My Profile
          </Link>

          <div className="border-t border-white/10 p-3">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}