"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* HEADER */}
      <header className="fixed top-0 left-0 z-50 w-screen max-w-[100vw] bg-[#050403] border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-amber-300 flex items-center justify-center font-black text-black">
              👑
            </div>
            <div>
              <p className="text-white font-bold">Mvip Booking</p>
              <p className="text-xs text-slate-400">
                Premium booking platform
              </p>
            </div>
          </Link>

          {/* HAMBURGER */}
          <button
            onClick={() => setOpen(true)}
            className="h-10 w-10 rounded-xl border border-white/10 flex items-center justify-center text-white"
          >
            ☰
          </button>
        </div>
      </header>

      {/* SPACER (TRÁNH BỊ ĐÈ) */}
      <div className="h-[64px]" />

      {/* MOBILE MENU FIX CỨNG */}
      {open && (
        <div className="fixed inset-0 z-[999] w-screen h-screen max-w-[100vw] bg-black/80 backdrop-blur">
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-[320px] bg-[#11100c] border-l border-white/10 p-5 overflow-y-auto">
            {/* CLOSE */}
            <div className="flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-xl border border-white/10 text-white"
              >
                ✕
              </button>
            </div>

            {/* MENU */}
            <div className="mt-6 flex flex-col gap-4 text-white font-bold">
              <Link href="/dashboard/customer" onClick={() => setOpen(false)}>
                Dashboard
              </Link>

              <Link href="/restaurants" onClick={() => setOpen(false)}>
                Restaurants
              </Link>

              <Link href="/profile" onClick={() => setOpen(false)}>
                My Profile
              </Link>

              <button
                onClick={handleLogout}
                className="text-left text-red-400"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}