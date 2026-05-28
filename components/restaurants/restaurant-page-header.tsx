"use client";

// components/restaurants/restaurant-page-header.tsx
// Client component — đọc cookie mvip_lang để hiển thị đúng ngôn ngữ.
// Nhận cả nameEn lẫn nameZh từ server, không cần fetch thêm.

import { useLang } from "@/lib/hooks/use-lang";

type Props = {
  nameEn: string;
  nameZh: string;
  isActive: boolean;
};

const COPY = {
  en: {
    luxuryDiningPartner: "Luxury Dining Partner",
    reviews: "Reviews",
    exclusiveOffer: "Exclusive Offer",
    instantCustomerDiscount: "Instant customer discount",
  },
  zh: {
    luxuryDiningPartner: "高端餐饮合作伙伴",
    reviews: "评价",
    exclusiveOffer: "专属优惠",
    instantCustomerDiscount: "客户即时折扣",
  },
} as const;

export default function RestaurantPageHeader({ nameEn, nameZh }: Props) {
  const lang = useLang();
  const t = COPY[lang];
  const name = lang === "zh" && nameZh ? nameZh : nameEn;

  return (
    <section className="relative mb-5 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/35 backdrop-blur-2xl md:rounded-[34px] md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/10 via-transparent to-orange-800/20" />

      <div className="relative grid min-w-0 gap-3 md:grid-cols-[1fr_220px] md:items-center lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300 md:text-xs md:tracking-[0.28em]">
            {t.luxuryDiningPartner}
          </p>

          <h1 className="mt-3 max-w-full break-words text-[2.55rem] font-black leading-[1] tracking-tight text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.7)] md:text-5xl lg:text-6xl">
            {name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100">
              ★ {t.reviews}
            </div>
          </div>
        </div>

        <div className="-mt-1 max-w-full rounded-[18px] border border-amber-300/20 bg-gradient-to-br from-amber-300/16 to-yellow-700/10 px-4 py-3 text-center shadow-xl shadow-amber-900/10 backdrop-blur-xl md:mt-0 md:rounded-[22px] md:px-5 md:py-4">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-200 md:text-[10px]">
            {t.exclusiveOffer}
          </p>

          <p className="mt-1 text-3xl font-black leading-none text-amber-300 md:text-4xl">
            -5%
          </p>

          <p className="mt-1 text-[11px] font-bold leading-5 text-slate-300 md:text-xs">
            {t.instantCustomerDiscount}
          </p>
        </div>
      </div>
    </section>
  );
}
