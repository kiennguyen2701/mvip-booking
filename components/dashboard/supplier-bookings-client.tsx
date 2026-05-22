"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { BookingStatusTimeline } from "@/components/dashboard/booking-status-timeline";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
type FilterStatus = "all" | BookingStatus;

type BookingLog = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by_role: string | null;
  note: string | null;
  created_at: string;
};

type RestaurantInfo = {
  id?: string;
  name?: string;
  slug?: string;
  city?: string;
  address?: string;
};

type BookingRow = {
  id: string;
  booking_code?: string | null;
  customer_full_name?: string | null;
  customer_name?: string | null;
  name?: string | null;
  customer_email?: string | null;
  email?: string | null;
  customer_phone?: string | null;
  phone?: string | null;
  customer_whatsapp?: string | null;
  whatsapp?: string | null;
  restaurant_id?: string | null;
  supplier_id?: string | null;
  service_name?: string | null;
  agent_id?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  guest_count?: number | null;
  guests?: number | null;
  note?: string | null;
  supplier_note?: string | null;
  cancellation_reason?: string | null;
  status?: string | null;
  total_bill?: number | null;
  customer_discount_amount?: number | null;
  platform_commission_amount?: number | null;
  agent_commission_amount?: number | null;
  platform_net_amount?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  restaurants?: unknown;
  booking_status_logs?: unknown;
};

const INITIAL_VISIBLE_COUNT = 35;
const LOAD_MORE_COUNT = 35;

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function normalizeStatus(value?: string | null): BookingStatus {
  if (value === "confirmed") return "confirmed";
  if (value === "completed") return "completed";
  if (value === "cancelled" || value === "canceled") return "cancelled";
  return "pending";
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function getAllowedNextStatuses(status?: string | null): BookingStatus[] {
  const value = normalizeStatus(status);
  if (value === "pending") return ["confirmed", "cancelled"];
  if (value === "confirmed") return ["completed", "cancelled"];
  return [];
}

function isLockedStatus(status?: string | null) {
  const value = normalizeStatus(status);
  return value === "completed" || value === "cancelled";
}

function formatMoney(value?: number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getRestaurant(booking: BookingRow) {
  return booking.restaurants as RestaurantInfo | null;
}

function getLogs(booking: BookingRow) {
  return (((booking.booking_status_logs as BookingLog[] | null) ?? []) || [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function getCustomerName(booking: BookingRow) {
  return booking.customer_full_name || booking.customer_name || booking.name || "Customer";
}

function getCustomerEmail(booking: BookingRow) {
  return booking.customer_email || booking.email || null;
}

function getCustomerPhone(booking: BookingRow) {
  return booking.customer_phone || booking.phone || "-";
}

function getCustomerWhatsapp(booking: BookingRow) {
  return booking.customer_whatsapp || booking.whatsapp || "-";
}

function getGuestCount(booking: BookingRow) {
  return booking.guest_count ?? booking.guests ?? 1;
}

function getAgentPlatformCommissionAmount(booking: BookingRow) {
  return Number(
    booking.platform_commission_amount ??
      (Number(booking.total_bill ?? 0) > 0 ? Number(booking.total_bill ?? 0) * 0.1 : 0),
  );
}

function getSearchText(booking: BookingRow) {
  const restaurant = getRestaurant(booking);

  return normalizeSearch(
    [
      booking.booking_code,
      booking.id,
      getCustomerName(booking),
      getCustomerEmail(booking),
      getCustomerPhone(booking),
      getCustomerWhatsapp(booking),
      restaurant?.name,
      restaurant?.city,
      booking.service_name,
      booking.booking_date,
      booking.booking_time,
      normalizeStatus(booking.status),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getStatusMessage(success?: string | null, error?: string | null) {
  if (success === "updated") {
    return { type: "success" as const, text: "Cập nhật trạng thái booking thành công." };
  }

  if (success === "no_change") {
    return { type: "warning" as const, text: "Trạng thái không thay đổi." };
  }

  if (!error) return null;

  const errorMap: Record<string, string> = {
    missing_total_bill: "Khi chuyển sang completed, anh cần nhập tổng bill.",
    status_locked: "Booking đã completed hoặc cancelled nên không thể đổi trạng thái nữa.",
    invalid_status_transition:
      "Luồng trạng thái không hợp lệ. Pending chỉ được Confirmed/Cancelled. Confirmed chỉ được Completed/Cancelled.",
    missing_cancellation_reason: "Khi hủy booking, anh cần nhập lý do hủy.",
    missing_id: "Thiếu booking ID.",
  };

  return { type: "error" as const, text: errorMap[error] || decodeURIComponent(error) };
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function MoneyInfo({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">{label}</p>
      <p className="mt-2 text-sm font-black text-white">{formatMoney(value)}</p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#11100c]/95 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">{label}</p>
      <p className="mt-2 break-words text-sm text-slate-300">{value}</p>
    </div>
  );
}

function BookingModal({
  booking,
  onClose,
  updateAction,
}: {
  booking: BookingRow;
  onClose: () => void;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const restaurant = getRestaurant(booking);
  const logs = getLogs(booking);
  const locked = isLockedStatus(booking.status);
  const allowedStatuses = getAllowedNextStatuses(booking.status);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/75 px-4 py-6 text-white backdrop-blur-sm">
      <button type="button" onClick={onClose} className="fixed inset-0 cursor-default" aria-label="Close booking detail" />

      <section className="relative z-10 mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#11100c] shadow-2xl shadow-black/80">
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-white/10 bg-[#11100c]/95 px-5 py-4 backdrop-blur md:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Booking Detail</p>
            <h2 className="mt-1 text-2xl font-black text-white">{booking.booking_code || booking.id}</h2>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status as BookingStatus} />
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/10 text-2xl font-black hover:bg-white/15"
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_360px] lg:p-6">
          <div className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#11100c]/95 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">Thông tin khách</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info label="Khách hàng" value={getCustomerName(booking)} />
                <Info label="Email" value={getCustomerEmail(booking) || "-"} />
                <Info label="Phone" value={getCustomerPhone(booking)} />
                <Info label="Whatsapp" value={getCustomerWhatsapp(booking)} />
                <Info label="Nhà hàng" value={restaurant?.name || booking.service_name || "-"} />
                <Info label="Địa điểm" value={[restaurant?.city, restaurant?.address].filter(Boolean).join(" · ") || "-"} />
                <Info label="Ngày" value={booking.booking_date || "-"} />
                <Info label="Giờ" value={booking.booking_time || "-"} />
                <Info label="Số khách" value={String(getGuestCount(booking))} />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#11100c]/95 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">Bill & Commission</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <MoneyInfo label="Total Bill" value={booking.total_bill} />
                <MoneyInfo label="Customer Discount 5%" value={booking.customer_discount_amount} />
                <MoneyInfo label="Platform Commission 10%" value={getAgentPlatformCommissionAmount(booking)} />
                <MoneyInfo label="Agent Commission 5%" value={booking.agent_commission_amount} />
                <MoneyInfo label="Platform Net 5%" value={booking.platform_net_amount} />
              </div>
            </section>

            {booking.note ? <TextBlock label="Ghi chú khách" value={booking.note} /> : null}
            {booking.supplier_note ? <TextBlock label="Ghi chú supplier" value={booking.supplier_note} /> : null}
            {booking.cancellation_reason ? <TextBlock label="Lý do hủy" value={booking.cancellation_reason} /> : null}

            <BookingStatusTimeline logs={logs} />
          </div>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/10 bg-[#11100c]/95 p-4">
              <h3 className="text-sm font-black text-white">Update Status</h3>

              {locked ? (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-400">
                  Booking đã {normalizeStatus(booking.status)} nên không thể cập nhật tiếp.
                </p>
              ) : (
                <form action={updateAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="id" value={booking.id} />

                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Trạng thái</span>
                    <select
                      name="status"
                      required
                      defaultValue=""
                      className="rounded-xl border border-white/10 bg-[#070604] px-3 py-3 text-sm text-white outline-none focus:border-amber-300"
                    >
                      <option value="" disabled>
                        Chọn trạng thái tiếp theo
                      </option>
                      {allowedStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  {normalizeStatus(booking.status) === "confirmed" ? (
                    <label className="grid gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
                        Tổng bill khi completed
                      </span>
                      <input
                        name="total_bill"
                        type="number"
                        min="0"
                        step="1000"
                        defaultValue={booking.total_bill || ""}
                        placeholder="VD: 3200000"
                        className="rounded-xl border border-white/10 bg-[#070604] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
                      />
                    </label>
                  ) : (
                    <input type="hidden" name="total_bill" value="0" />
                  )}

                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Lý do hủy nếu cancelled</span>
                    <input
                      name="cancellation_reason"
                      placeholder="Nhập lý do nếu hủy booking"
                      defaultValue={booking.cancellation_reason || ""}
                      className="rounded-xl border border-white/10 bg-[#070604] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
                    />
                  </label>

                  <button className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200">
                    Cập nhật trạng thái
                  </button>
                </form>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#11100c]/95 p-4">
              <h3 className="text-sm font-black text-white">Quick Rule</h3>
              <div className="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-400">
                <p>• Pending → Confirmed / Cancelled</p>
                <p>• Confirmed → Completed / Cancelled</p>
                <p>• Completed / Cancelled → Locked</p>
                <p>• Completed bắt buộc nhập total bill</p>
                <p>• Cancelled bắt buộc nhập lý do hủy</p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}

export function SupplierBookingsClient({
  bookings,
  updateAction,
}: {
  bookings: BookingRow[];
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeStatus, setActiveStatus] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const message = getStatusMessage(success, error);

  useEffect(() => {
    const hasLiveBookings = bookings.some((booking) => {
      const status = normalizeStatus(booking.status);
      return status === "pending" || status === "confirmed";
    });

    if (!hasLiveBookings) return;

    const timer = window.setInterval(() => {
      startRefresh(() => router.refresh());
    }, 15000);

    return () => window.clearInterval(timer);
  }, [bookings, router]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [activeStatus, deferredSearch]);

  const counts = useMemo(() => {
    const result = { all: bookings.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    for (const booking of bookings) result[normalizeStatus(booking.status)] += 1;
    return result;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const keyword = normalizeSearch(deferredSearch);

    return bookings.filter((booking) => {
      const statusMatch = activeStatus === "all" || normalizeStatus(booking.status) === activeStatus;
      const searchMatch = !keyword || getSearchText(booking).includes(keyword);
      return statusMatch && searchMatch;
    });
  }, [activeStatus, bookings, deferredSearch]);

  const visibleBookings = useMemo(
    () => filteredBookings.slice(0, visibleCount),
    [filteredBookings, visibleCount],
  );

  const totalCompletedRevenue = useMemo(
    () =>
      bookings.reduce(
        (sum, booking) => sum + (normalizeStatus(booking.status) === "completed" ? Number(booking.total_bill ?? 0) : 0),
        0,
      ),
    [bookings],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050403] px-4 py-5 text-white md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[520px] w-[520px] rounded-full bg-orange-700/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(251,191,36,0.12)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-5">
        <section className="rounded-[32px] border border-white/10 bg-[#11100c]/95 p-5 shadow-2xl shadow-black/40 backdrop-blur md:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">Supplier Dashboard</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">Quản lý booking</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Pending chỉ được confirm/cancel. Confirmed chỉ được completed/cancel.
              </p>
            </div>

            <Link
              href="/dashboard/supplier"
              prefetch
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:border-amber-300/50 hover:bg-white/10"
            >
              Tổng quan
            </Link>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-[#11100c]/95 p-4 shadow-2xl shadow-black/35 backdrop-blur">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-sm font-black text-white">
                Doanh thu completed: <span className="text-amber-300">{formatMoney(totalCompletedRevenue)}</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {isRefreshing ? "Đang đồng bộ dữ liệu mới..." : `Đang hiển thị ${visibleBookings.length}/${filteredBookings.length} booking.`}
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((filter) => {
                const selected = activeStatus === filter.value;
                const count = counts[filter.value];

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveStatus(filter.value)}
                    className={
                      selected
                        ? "whitespace-nowrap rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/20 transition"
                        : "whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-slate-300 transition hover:border-amber-300/40 hover:bg-white/10 hover:text-white"
                    }
                  >
                    {filter.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm booking, khách, SĐT, email, nhà hàng..."
            className="mt-4 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
          />
        </section>

        {message ? (
          <div
            className={
              message.type === "success"
                ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm font-bold text-emerald-200"
                : message.type === "warning"
                  ? "rounded-2xl border border-amber-300/25 bg-amber-300/10 px-5 py-4 text-sm font-bold text-amber-200"
                  : "rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-200"
            }
          >
            {message.text}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#11100c]/95 shadow-2xl shadow-black/35 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-black">Booking</th>
                  <th className="px-5 py-4 font-black">Khách</th>
                  <th className="px-5 py-4 font-black">Nhà hàng</th>
                  <th className="px-5 py-4 font-black">Thời gian</th>
                  <th className="px-5 py-4 font-black">Số khách</th>
                  <th className="px-5 py-4 font-black">Status</th>
                  <th className="px-5 py-4 text-right font-black">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {visibleBookings.map((booking) => {
                  const restaurant = getRestaurant(booking);

                  return (
                    <tr key={booking.id} className="align-top transition hover:bg-white/[0.04]">
                      <td className="px-5 py-5">
                        <p className="font-black text-white">{booking.booking_code || booking.id.slice(0, 8)}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {booking.created_at ? new Date(booking.created_at).toLocaleString("vi-VN") : "-"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-bold text-white">{getCustomerName(booking)}</p>
                        <p className="mt-1 text-xs text-slate-400">{getCustomerPhone(booking)}</p>
                        <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">{getCustomerEmail(booking) || "-"}</p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-bold text-white">{restaurant?.name || booking.service_name || "-"}</p>
                        <p className="mt-1 text-xs text-slate-400">{restaurant?.city || "-"}</p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-bold text-white">{booking.booking_date || "-"}</p>
                        <p className="mt-1 text-xs text-slate-400">{booking.booking_time || "-"}</p>
                      </td>

                      <td className="px-5 py-5 font-bold text-slate-200">{getGuestCount(booking)}</td>

                      <td className="px-5 py-5">
                        <StatusBadge status={booking.status as BookingStatus} />
                      </td>

                      <td className="px-5 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className="rounded-xl bg-amber-300 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-200"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!filteredBookings.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm font-semibold text-slate-400">
                      Không có booking nào ở trạng thái này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {visibleBookings.length < filteredBookings.length ? (
            <div className="border-t border-white/10 p-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + LOAD_MORE_COUNT)}
                className="rounded-2xl bg-amber-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
              >
                Load more ({visibleBookings.length}/{filteredBookings.length})
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {selectedBooking ? (
        <BookingModal
          booking={selectedBooking}
          updateAction={updateAction}
          onClose={() => setSelectedBooking(null)}
        />
      ) : null}
    </main>
  );
}