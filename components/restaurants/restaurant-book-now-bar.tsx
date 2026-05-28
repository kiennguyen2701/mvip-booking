"use client";

// components/restaurants/restaurant-book-now-bar.tsx
// Mobile sticky bar — tách ra client vì dùng useLang()

import { useLang } from "@/lib/hooks/use-lang";

const COPY = {
  en: { bookNow: "Book Now" },
  zh: { bookNow: "立即预订" },
} as const;

export default function RestaurantBookNowBar() {
  const lang = useLang();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#070604]/92 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl md:hidden">
      <a
        href="#booking-form"
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-amber-300 text-base font-black text-slate-950 shadow-2xl shadow-amber-950/30 active:scale-[0.99]"
      >
        {COPY[lang].bookNow}
      </a>
    </div>
  );
}
