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
      if (!menuRef.current.contains(event.target as Node)) setOpen(false);
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
        <div className="absolute right-0 top-full z-[10000] mt-2 flex items-center gap-1 rounded-2xl border border-white/10 bg-[#11100c]/95 p-1.5 text-white shadow-2xl shadow-black/60 backdrop-blur-xl">
          <Link
            href="/dashboard/customer"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/customer/bookings"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            Bookings
          </Link>

          <Link
            href="/dashboard/customer/profile"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            Profile
          </Link>

          <div className="h-6 w-px bg-white/10" />

          <div className="[&_button]:h-8 [&_button]:whitespace-nowrap [&_button]:rounded-xl [&_button]:border [&_button]:border-white/10 [&_button]:px-3 [&_button]:py-0 [&_button]:text-xs [&_button]:font-black [&_button]:leading-none [&_button]:text-white hover:[&_button]:border-red-300/40 hover:[&_button]:bg-red-500/20">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}