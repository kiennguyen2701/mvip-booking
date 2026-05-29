import React from "react";
"use client";

// components/booking/booking-confirmation-client.tsx
//
// Client component — dùng useLang() để hiển thị đúng ngôn ngữ.
// Nhận cả 2 ngôn ngữ từ server page, không cần fetch thêm.

import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookingData = {
  id: string;
  bookingCode: string;
  customerName: string;
  bookingDate: string;
  bookingTime: string;
  guests: number | string;
  status: string;
  customerLanguage: "en" | "zh"; // ngôn ngữ lưu lúc book
};

type RestaurantData = {
  nameEn: string | null;
  nameZh: string | null;
  addressEn: string | null;
  addressZh: string | null;
  cityEn: string | null;
  cityZh: string | null;
  latitude: number | null;
  longitude: number | null;
} | null;

type Props = {
  booking: BookingData;
  restaurant: RestaurantData;
  serviceNameFallback: string;
  cancelButton?: React.ReactNode;
};

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const COPY = {
  en: {
    eyebrow: "Booking Confirmation",
    title: "Booking Created",
    subtitle: "Your reservation has been successfully submitted.",
    bookingCode: "Booking Code",
    customerName: "Customer Name",
    restaurant: "Restaurant",
    address: "Address",
    guests: "Guests",
    date: "Date",
    time: "Time",
    status: "Status",
    openLocation: "📍 Open Restaurant Location",
    benefitTitle: "Customer Benefit",
    benefitPercent: "5%",
    benefitDesc:
      "This discount will be applied directly to your bill at the restaurant according to Mvip Booking policy.",
    dashboard: "Go to Customer Dashboard",
  },
  zh: {
    eyebrow: "预订确认",
    title: "预订已创建",
    subtitle: "您的预订已成功提交。",
    bookingCode: "预订编号",
    customerName: "顾客姓名",
    restaurant: "餐厅",
    address: "地址",
    guests: "人数",
    date: "日期",
    time: "时间",
    status: "状态",
    openLocation: "📍 打开餐厅位置",
    benefitTitle: "顾客优惠",
    benefitPercent: "5%",
    benefitDesc: "此折扣将根据 Mvip Booking 政策直接抵扣您在餐厅的账单。",
    dashboard: "前往顾客中心",
  },
} as const;

// Status badge translations
const STATUS_COPY = {
  en: {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  zh: {
    pending: "待确认",
    confirmed: "已确认",
    completed: "已完成",
    cancelled: "已取消",
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildGoogleMapsUrl({
  restaurantName,
  address,
  city,
  latitude,
  longitude,
}: {
  restaurantName?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  if (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  const query = [restaurantName, address, city].filter(Boolean).join(", ");
  if (!query) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BookingConfirmationClient({
  booking,
  restaurant,
  serviceNameFallback,
  cancelButton,
}: Props) {
  // Dùng booking.customerLanguage từ DB làm nguồn sự thật chính.
  // Đây là giá trị đã lưu lúc book — chắc chắn đúng, không phụ thuộc cookie.
  // Không dùng useLang() vì trang này không có ISR — data từ DB là đủ tin cậy.
  const lang = booking.customerLanguage;

  const t = COPY[lang];
  const statusCopy = STATUS_COPY[lang];

  // Chọn đúng ngôn ngữ cho restaurant data
  const restaurantName =
    (lang === "zh" ? restaurant?.nameZh : null) ??
    restaurant?.nameEn ??
    serviceNameFallback;

  const address = (lang === "zh" ? restaurant?.addressZh : null) ?? restaurant?.addressEn ?? null;
  const city = (lang === "zh" ? restaurant?.cityZh : null) ?? restaurant?.cityEn ?? null;

  const restaurantAddress = [address, city].filter(Boolean).join(", ");

  const googleMapsUrl = buildGoogleMapsUrl({
    restaurantName,
    address,
    city,
    latitude: restaurant?.latitude,
    longitude: restaurant?.longitude,
  });

  const statusKey = booking.status as keyof typeof statusCopy;
  const statusLabel = statusCopy[statusKey] ?? booking.status;

  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#080704] px-4 py-6 text-white md:px-6 md:py-10">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[360px] w-[360px] rounded-full bg-amber-500/20 blur-3xl md:h-[460px] md:w-[460px]" />
        <div className="absolute right-[-180px] top-20 h-[420px] w-[420px] rounded-full bg-orange-700/20 blur-3xl md:h-[520px] md:w-[520px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.1)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <section className="relative mx-auto w-full max-w-[680px]">
        <div className="w-full max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:rounded-[36px] md:p-8">

          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-600 text-3xl text-slate-950 shadow-2xl shadow-amber-900/30 md:h-16 md:w-16 md:rounded-3xl">
              ✓
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.25em] text-amber-300 md:text-xs">
              {t.eyebrow}
            </p>

            <h1 className="mt-3 break-words text-3xl font-black tracking-tight text-white md:text-4xl">
              {t.title}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {t.subtitle}
            </p>
          </div>

          {/* Booking details card */}
          <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-black/20 md:mt-8">
            <Row label={t.bookingCode} value={booking.bookingCode} />
            <Row label={t.customerName} value={booking.customerName} />
            <Row label={t.restaurant} value={restaurantName} />
            <Row label={t.address} value={restaurantAddress || "—"} />
            <Row label={t.guests} value={String(booking.guests)} />
            <Row label={t.date} value={booking.bookingDate} />
            <Row label={t.time} value={booking.bookingTime} />
            <Row label={t.status} value={statusLabel} />
          </div>

          {/* Google Maps button */}
          {googleMapsUrl ? (
            <div className="mt-4">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-4 text-sm font-black text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/15"
              >
                {t.openLocation}
              </a>
            </div>
          ) : null}

          {/* 5% discount benefit */}
          <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4 md:mt-6 md:p-5">
            <p className="text-sm font-black text-emerald-200">{t.benefitTitle}</p>
            <p className="mt-2 text-3xl font-black text-emerald-300 md:text-4xl">
              {t.benefitPercent}
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">
              {t.benefitDesc}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-6 md:mt-8">
            <Link
              href="/dashboard/customer"
              className="block w-full rounded-2xl bg-amber-300 px-5 py-4 text-center text-sm font-black text-slate-950 shadow-xl shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-200"
            >
              {t.dashboard}
            </Link>

            {cancelButton}

          </div>

        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Row helper
// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid w-full max-w-full grid-cols-1 gap-1 border-b border-white/10 px-4 py-4 last:border-b-0 md:grid-cols-[180px_1fr] md:gap-4 md:px-5">
      <span className="min-w-0 text-xs font-bold uppercase tracking-wide text-slate-400 md:text-sm md:normal-case md:tracking-normal">
        {label}
      </span>
      <span className="min-w-0 break-words text-left text-sm font-black text-white md:text-right">
        {value}
      </span>
    </div>
  );
}
