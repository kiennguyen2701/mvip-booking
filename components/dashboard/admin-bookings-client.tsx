"use client";

import Link from "next/link";
import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
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

type RestaurantRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  supplier_id?: string | null;
};

type AgentRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  referral_code?: string | null;
  ref_code?: string | null;
  agent_code?: string | null;
  code?: string | null;
};

export type AdminBookingRow = {
  id: string;
  booking_code?: string | null;
  customer_name?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  restaurant_id?: string | null;
  supplier_id?: string | null;
  service_name?: string | null;
  agent_id?: string | null;
  status?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  guests?: number | null;
  guest_count?: number | null;
  total_bill?: number | null;
  customer_discount_amount?: number | null;
  platform_commission_amount?: number | null;
  agent_commission_amount?: number | null;
  platform_net_amount?: number | null;
  cancellation_reason?: string | null;
  created_at?: string | null;
  restaurants?: RestaurantRow | null;
  agent?: AgentRow | null;
  booking_status_logs?: BookingLog[] | null;
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

function normalizeStatus(status?: string | null): BookingStatus {
  if (status === "confirmed") return "confirmed";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
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
  return Number(value || 0).toLocaleString("vi-VN");
}

function getStatusClass(status?: string | null) {
  const value = normalizeStatus(status);
  if (value === "confirmed") return "bg-blue-50 text-blue-700 border-blue-200";
  if (value === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "cancelled") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function getAgentName(agent?: AgentRow | null) {
  return agent?.full_name || agent?.name || agent?.email || "-";
}

function getAgentRef(agent?: AgentRow | null) {
  return agent?.referral_code || agent?.ref_code || agent?.agent_code || agent?.code || "-";
}

function getCustomerName(booking: AdminBookingRow) {
  return booking.customer_name || booking.name || "-";
}

function getCustomerEmail(booking: AdminBookingRow) {
  return booking.email || "-";
}

function getCustomerPhone(booking: AdminBookingRow) {
  return booking.phone || "-";
}

function getCustomerWhatsapp(booking: AdminBookingRow) {
  return booking.whatsapp || booking.phone || "-";
}

function getGuestCount(booking: AdminBookingRow) {
  return booking.guest_count ?? booking.guests ?? 1;
}

function getRestaurantName(booking: AdminBookingRow) {
  return booking.restaurants?.name || booking.service_name || "Restaurant";
}

function getRestaurantPhone(booking: AdminBookingRow) {
  return booking.restaurants?.phone || "-";
}

function getRestaurantLocation(booking: AdminBookingRow) {
  const city = booking.restaurants?.city || "";
  const address = booking.restaurants?.address || "";
  if (address && city) return `${city} · ${address}`;
  if (address) return address;
  if (city) return city;
  return "-";
}

function getAgentPlatformCommissionAmount(booking: AdminBookingRow) {
  return Number(
    booking.platform_commission_amount ??
      (Number(booking.total_bill ?? 0) > 0 ? Number(booking.total_bill ?? 0) * 0.1 : 0),
  );
}

function getLogs(booking: AdminBookingRow): BookingLog[] {
  return (booking.booking_status_logs || [])
    .map((log) => ({
      id: log.id,
      old_status: log.old_status,
      new_status: log.new_status,
      changed_by_role: log.changed_by_role ?? null,
      note: log.note,
      created_at: log.created_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function getSearchText(booking: AdminBookingRow) {
  return normalizeSearch(
    [
      booking.booking_code,
      booking.id,
      getCustomerName(booking),
      booking.email,
      booking.phone,
      booking.whatsapp,
      getRestaurantName(booking),
      getRestaurantPhone(booking),
      getAgentName(booking.agent),
      getAgentRef(booking.agent),
      booking.booking_date,
      booking.booking_time,
      normalizeStatus(booking.status),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(status)}`}>
      {normalizeStatus(status)}
    </span>
  );
}

function MessageBlock({ success, error }: { success?: string; error?: string }) {
  if (success === "updated") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
        Cập nhật trạng thái booking thành công.
      </div>
    );
  }

  if (success === "deleted") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
        Đã xóa booking thành công.
      </div>
    );
  }

  if (success === "no_change") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">
        Trạng thái không thay đổi.
      </div>
    );
  }

  if (!error) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
      {error === "missing_total_bill"
        ? "Khi chuyển sang completed, anh cần nhập tổng bill."
        : error === "status_locked"
          ? "Booking đã completed hoặc cancelled nên không thể đổi trạng thái nữa."
          : error === "invalid_status_transition"
            ? "Luồng trạng thái không hợp lệ. Pending chỉ được Confirmed/Cancelled. Confirmed chỉ được Completed/Cancelled."
            : error === "missing_cancellation_reason"
              ? "Khi hủy booking, anh cần nhập lý do hủy."
              : decodeURIComponent(error)}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function MoneyInfo({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">{label}</p>
      <p className="mt-2 text-base font-black text-white">{formatMoney(value)}đ</p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-white/90">{value}</p>
    </div>
  );
}

const QuickUpdateForm = memo(function QuickUpdateForm({
  booking,
  updateAction,
  dark = false,
}: {
  booking: AdminBookingRow;
  updateAction: (formData: FormData) => void | Promise<void>;
  dark?: boolean;
}) {
  const allowedStatuses = getAllowedNextStatuses(booking.status);

  if (allowedStatuses.length === 0) {
    return (
      <div
        className={
          dark
            ? "rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-slate-300"
            : "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500"
        }
      >
        Booking đã {normalizeStatus(booking.status)} nên không thể cập nhật tiếp.
      </div>
    );
  }

  return (
    <form action={updateAction} className="grid gap-3">
      <input type="hidden" name="id" value={booking.id} />

      <label className="grid gap-2">
        <span className={dark ? "text-xs font-black uppercase tracking-[0.18em] text-slate-300" : "text-xs font-black uppercase tracking-wide text-slate-500"}>
          Trạng thái
        </span>

        <select
          name="status"
          defaultValue=""
          className={
            dark
              ? "rounded-xl border border-white/10 bg-[#181815] px-3 py-3 text-sm font-semibold text-white outline-none focus:border-amber-400"
              : "rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          }
          required
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
          <span className={dark ? "text-xs font-black uppercase tracking-[0.18em] text-slate-300" : "text-xs font-black uppercase tracking-wide text-slate-500"}>
            Tổng bill nếu completed
          </span>

          <input
            name="total_bill"
            type="number"
            min="0"
            step="1000"
            defaultValue={booking.total_bill || ""}
            placeholder="VD: 9500000"
            className={
              dark
                ? "rounded-xl border border-white/10 bg-[#181815] px-3 py-3 text-sm text-white outline-none focus:border-amber-400"
                : "rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
            }
          />
        </label>
      ) : (
        <input type="hidden" name="total_bill" value="0" />
      )}

      <label className="grid gap-2">
        <span className={dark ? "text-xs font-black uppercase tracking-[0.18em] text-slate-300" : "text-xs font-black uppercase tracking-wide text-slate-500"}>
          Lý do hủy nếu cancelled
        </span>

        <input
          name="cancellation_reason"
          placeholder="Nhập lý do nếu hủy booking"
          className={
            dark
              ? "rounded-xl border border-white/10 bg-[#181815] px-3 py-3 text-sm text-white outline-none focus:border-amber-400"
              : "rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          }
        />
      </label>

      <button
        type="submit"
        className={
          dark
            ? "rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300"
            : "rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
        }
      >
        Cập nhật trạng thái
      </button>
    </form>
  );
});

function QuickUpdateDetails({
  booking,
  updateAction,
}: {
  booking: AdminBookingRow;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  if (isLockedStatus(booking.status)) {
    return (
      <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
        Locked
      </span>
    );
  }

  return (
    <details className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm md:w-[360px]">
      <summary className="cursor-pointer text-xs font-black text-slate-700">
        Cập nhật nhanh
      </summary>
      <div className="mt-3">
        <QuickUpdateForm booking={booking} updateAction={updateAction} />
      </div>
    </details>
  );
}

function BookingDetailModal({
  booking,
  updateAction,
  onClose,
}: {
  booking: AdminBookingRow;
  updateAction: (formData: FormData) => void | Promise<void>;
  onClose: () => void;
}) {
  const logs = getLogs(booking);
  const locked = isLockedStatus(booking.status);

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
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 px-3 py-6 backdrop-blur-md md:px-6">
      <button type="button" aria-label="Close modal" className="absolute inset-0 cursor-default" onClick={onClose} />

      <section className="relative z-[81] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#11110f] text-white shadow-2xl">
        <header className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 md:flex-row md:items-start md:justify-between md:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-300">Booking Detail</p>
            <h2 className="mt-2 break-words text-2xl font-black md:text-3xl">
              {booking.booking_code || booking.id}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status} />
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/10 text-2xl font-bold text-white hover:bg-white/15"
            >
              ×
            </button>
          </div>
        </header>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_380px] lg:p-7">
          <div className="space-y-5">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-base font-black uppercase tracking-[0.25em] text-amber-300">Thông tin booking</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Info label="Khách hàng" value={getCustomerName(booking)} />
                <Info label="Email" value={getCustomerEmail(booking)} />
                <Info label="Phone" value={getCustomerPhone(booking)} />
                <Info label="Whatsapp" value={getCustomerWhatsapp(booking)} />
                <Info label="Nhà hàng" value={getRestaurantName(booking)} />
                <Info label="SĐT nhà hàng" value={getRestaurantPhone(booking)} />
                <Info label="Địa điểm" value={getRestaurantLocation(booking)} />
                <Info label="Ngày" value={booking.booking_date || "-"} />
                <Info label="Giờ" value={booking.booking_time || "-"} />
                <Info label="Số khách" value={String(getGuestCount(booking))} />
                <Info label="Agent" value={getAgentName(booking.agent)} />
                <Info label="Mã agent" value={getAgentRef(booking.agent)} />
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-base font-black uppercase tracking-[0.25em] text-amber-300">Bill & Commission</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <MoneyInfo label="Total bill" value={booking.total_bill} />
                <MoneyInfo label="Customer off 5%" value={booking.customer_discount_amount} />
                <MoneyInfo label="Agent + Platform 10%" value={getAgentPlatformCommissionAmount(booking)} />
                <MoneyInfo label="Platform net 5%" value={booking.platform_net_amount} />
              </div>
            </section>

            {booking.cancellation_reason ? (
              <TextBlock label="Lý do hủy" value={booking.cancellation_reason} />
            ) : null}

            <BookingStatusTimeline logs={logs} />
          </div>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-base font-black uppercase tracking-[0.25em] text-amber-300">Update Status</h3>
              {locked ? (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-slate-300">
                  Booking đã {normalizeStatus(booking.status)} nên không thể cập nhật tiếp.
                </p>
              ) : (
                <div className="mt-4">
                  <QuickUpdateForm booking={booking} updateAction={updateAction} dark />
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
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

export function AdminBookingsClient({
  bookings,
  initialStatus = "all",
  success,
  error,
  updateAction,
  deleteAction,
}: {
  bookings: AdminBookingRow[];
  initialStatus?: FilterStatus;
  success?: string;
  error?: string;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();

  const [activeStatus, setActiveStatus] = useState<FilterStatus>(initialStatus);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingRow | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const countByStatus = useMemo(() => {
    const counts = { all: bookings.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    for (const booking of bookings) counts[normalizeStatus(booking.status)] += 1;
    return counts;
  }, [bookings]);

  const totalCompletedRevenue = useMemo(
    () =>
      bookings.reduce(
        (sum, item) => sum + (normalizeStatus(item.status) === "completed" ? Number(item.total_bill || 0) : 0),
        0,
      ),
    [bookings],
  );

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

  const hasLiveBookings = useMemo(
    () => bookings.some((booking) => ["pending", "confirmed"].includes(normalizeStatus(booking.status))),
    [bookings],
  );

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [activeStatus, deferredSearch]);

  useEffect(() => {
    if (!hasLiveBookings) return;

    const timer = window.setInterval(() => {
      startRefresh(() => router.refresh());
    }, 15000);

    return () => window.clearInterval(timer);
  }, [hasLiveBookings, router]);

  return (
    <div className="relative mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">Admin Dashboard</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Quản lý booking</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pending chỉ được confirm/cancel. Confirmed chỉ được completed/cancel.
          </p>
        </div>

        <Link
          href="/dashboard/admin"
          prefetch
          className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Tổng quan
        </Link>
      </div>

      <section className="rounded-3xl border border-white/80 bg-white/95 p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <p className="text-sm font-black text-slate-950">
              Doanh thu completed: {formatMoney(totalCompletedRevenue)}đ
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isRefreshing ? "Đang đồng bộ dữ liệu booking mới..." : `Đang hiển thị ${visibleBookings.length}/${filteredBookings.length} booking.`}
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => {
              const selected = activeStatus === filter.value;
              const count = countByStatus[filter.value];

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveStatus(filter.value)}
                  className={
                    selected
                      ? "whitespace-nowrap rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition"
                      : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
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
          placeholder="Tìm booking, khách, SĐT, email, nhà hàng, agent..."
          className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300"
        />
      </section>

      <MessageBlock success={success} error={error} />

      <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Khách</th>
                <th className="px-4 py-3">Nhà hàng</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Bill</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleBookings.map((booking) => {
                const agent = booking.agent;

                return (
                  <tr key={booking.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-950">{booking.booking_code || booking.id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.created_at ? new Date(booking.created_at).toLocaleString("vi-VN") : "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">{getCustomerName(booking)}</p>
                      <p className="mt-1 text-xs text-slate-500">{booking.phone || "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">WA: {booking.whatsapp || booking.phone || "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">{booking.email || "-"}</p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">{getRestaurantName(booking)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{getRestaurantPhone(booking)}</p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">{booking.booking_date || "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.booking_time || "-"} · {getGuestCount(booking)} khách
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">{getAgentName(agent)}</p>
                      <p className="mt-1 text-xs text-slate-500">{getAgentRef(agent)}</p>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={booking.status} />
                      {normalizeStatus(booking.status) === "cancelled" ? (
                        <p className="mt-2 max-w-[180px] text-xs text-red-600">
                          {booking.cancellation_reason || "Chưa nhập lý do"}
                        </p>
                      ) : null}
                      {normalizeStatus(booking.status) === "completed" ? (
                        <p className="mt-2 text-xs font-bold text-emerald-700">
                          Total: {formatMoney(booking.total_bill)}đ
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">{formatMoney(booking.total_bill)}đ</p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Discount: {formatMoney(booking.customer_discount_amount)}đ
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Platform: {formatMoney(booking.platform_commission_amount)}đ
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Chi tiết
                        </button>

                        <QuickUpdateDetails booking={booking} updateAction={updateAction} />

                        <form action={deleteAction}>
                          <input type="hidden" name="id" value={booking.id} />
                          <input type="hidden" name="current_status" value={activeStatus} />
                          <button className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                            Xóa
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredBookings.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    Chưa có booking nào trong trạng thái này.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {visibleBookings.length < filteredBookings.length ? (
          <div className="border-t border-slate-100 p-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + LOAD_MORE_COUNT)}
              className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Load more ({visibleBookings.length}/{filteredBookings.length})
            </button>
          </div>
        ) : null}
      </section>

      {selectedBooking ? (
        <BookingDetailModal
          booking={selectedBooking}
          updateAction={updateAction}
          onClose={() => setSelectedBooking(null)}
        />
      ) : null}
    </div>
  );
}