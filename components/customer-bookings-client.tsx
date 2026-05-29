"use client";

import Link from "next/link";
import { useLang } from "@/lib/hooks/use-lang";

const COPY = {
  en: {
    customer: "Customer",
    title: "My Bookings",
    back: "Back",
    statusLabel: "Status",
    empty: "You have no bookings yet.",
    restaurant: "Restaurant",
    pending: "pending",
    confirmed: "confirmed",
    completed: "completed",
    cancelled: "cancelled",
  },
  zh: {
    customer: "顾客",
    title: "我的预订",
    back: "返回",
    statusLabel: "状态",
    empty: "您暂无预订记录。",
    restaurant: "餐厅",
    pending: "待确认",
    confirmed: "已确认",
    completed: "已完成",
    cancelled: "已取消",
  },
} as const;

type Booking = {
  id: string;
  booking_code?: string | null;
  service_name?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  status?: string | null;
};

function localizeStatus(status: string | null | undefined, t: typeof COPY.en) {
  if (status === "pending") return t.pending;
  if (status === "confirmed") return t.confirmed;
  if (status === "completed") return t.completed;
  if (status === "cancelled") return t.cancelled;
  return status || t.pending;
}

export default function CustomerBookingsClient({ bookings }: { bookings: Booking[] }) {
  const lang = useLang();
  const t = COPY[lang];

  return (
    <main className="min-h-screen bg-[#fbf7ef] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase text-amber-700">{t.customer}</p>
            <h1 className="text-2xl font-black text-slate-950">{t.title}</h1>
          </div>
          <Link href="/dashboard/customer" className="rounded-xl border bg-white px-5 py-3 text-sm font-bold">
            {t.back}
          </Link>
        </div>
        <section className="space-y-3">
          {bookings.map((booking) => (
            <Link key={booking.id} href={`/booking/${booking.id}`} className="block rounded-2xl border border-white/80 bg-white p-5 shadow-sm hover:shadow-md">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <p className="font-black text-slate-950">{booking.booking_code || booking.id}</p>
                  <p className="mt-1 text-sm text-slate-500">{booking.service_name || t.restaurant}</p>
                </div>
                <div className="text-sm md:text-right">
                  <p className="font-bold text-slate-950">{booking.booking_date || "-"} · {booking.booking_time || "-"}</p>
                  <p className="mt-1 text-slate-500">{t.statusLabel}: {localizeStatus(booking.status, t)}</p>
                </div>
              </div>
            </Link>
          ))}
          {!bookings.length && (
            <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">{t.empty}</div>
          )}
        </section>
      </div>
    </main>
  );
}
