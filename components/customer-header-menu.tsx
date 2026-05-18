"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CustomerHeaderMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
      setOpen(false);
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

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
        <div className="absolute right-0 top-full z-[10000] mt-2 w-[190px] rounded-2xl border border-white/10 bg-[#11100c] p-2 text-white shadow-2xl shadow-black/70">
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
            className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-bold leading-none text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            My Bookings
          </Link>

          <Link
            href="/dashboard/customer/profile"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-bold leading-none text-slate-200 transition hover:bg-amber-300 hover:text-slate-950"
          >
            My Profile
          </Link>

          <div className="my-2 h-px bg-white/10" />

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold leading-none text-red-200 transition hover:bg-red-500/20 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      )}
    </div>
  );
}