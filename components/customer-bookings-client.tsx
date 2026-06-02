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

function StatusBadge({ status, label }: { status?: string | null; label: string }) {
  const styles: Record<string, string> = {
    pending:
      "bg-amber-400/10 text-amber-300 border border-amber-400/20",
    confirmed:
      "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20",
    completed:
      "bg-violet-400/10 text-violet-300 border border-violet-400/20",
    cancelled:
      "bg-red-400/10 text-red-300 border border-red-400/20",
  };
  const cls = styles[status || ""] || "bg-white/5 text-white/40 border border-white/10";
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
}

export default function CustomerBookingsClient({ bookings }: { bookings: Booking[] }) {
  const lang = useLang();
  const t = COPY[lang];

  return (
    <main className="min-h-screen bg-[#050403] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">
              {t.customer}
            </p>
            <h1 className="text-2xl font-black text-white">{t.title}</h1>
          </div>
          <Link
            href="/dashboard/customer"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/60 transition hover:border-amber-400/30 hover:bg-white/10 hover:text-white"
          >
            {t.back}
          </Link>
        </div>

        {/* Booking list */}
        <section className="space-y-3">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/booking/${booking.id}`}
              className="group block rounded-2xl border border-white/8 bg-white/[0.04] p-5 backdrop-blur transition hover:border-amber-400/25 hover:bg-white/[0.07]"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="font-black text-amber-300 transition group-hover:text-amber-200">
                    {booking.booking_code || booking.id}
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    {booking.service_name || t.restaurant}
                  </p>
                </div>
                <div className="flex flex-row items-center justify-between gap-3 md:flex-col md:items-end">
                  <p className="text-sm font-semibold text-white/70">
                    {booking.booking_date || "-"} · {booking.booking_time || "-"}
                  </p>
                  <StatusBadge status={booking.status} label={localizeStatus(booking.status, t)} />
                </div>
              </div>
            </Link>
          ))}

          {!bookings.length && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-6 text-sm text-white/35">
              {t.empty}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
