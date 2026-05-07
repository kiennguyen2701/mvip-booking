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
      className="fixed z-[2147483647] w-64 overflow-hidden rounded-3xl border border-white/10 bg-[#11100c] p-2 text-white shadow-2xl shadow-black/80 ring-1 ring-amber-300/10"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard/customer/bookings"
          prefetch
          onClick={() => setOpen(false)}
          className="rounded-2xl px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10"
        >
          My Bookings
        </Link>

        <div className="border-t border-white/10 pt-2">
          <LogoutButton />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-black text-white shadow-xl shadow-black/30 transition hover:border-amber-300/50 hover:bg-amber-300 hover:text-slate-950"
        aria-label="Open customer menu"
      >
        ☰
      </button>

      {mounted && open ? createPortal(menu, document.body) : null}
    </>
  );
}