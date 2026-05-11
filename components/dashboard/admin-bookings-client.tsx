"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
type FilterStatus = "all" | BookingStatus;

type BookingLog = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by_role?: string | null;
  note: string | null;
  created_at: string;
};

type RestaurantRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
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
  if (value === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (value === "cancelled") return "bg-red-50 text-red-700 border-red-200";

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function getAgentName(agent?: AgentRow | null) {
  return agent?.full_name || agent?.name || agent?.email || "-";
}

function getAgentRef(agent?: AgentRow | null) {
  return (
    agent?.referral_code ||
    agent?.ref_code ||
    agent?.agent_code ||
    agent?.code ||
    "-"
  );
}

function getCustomerName(booking: AdminBookingRow) {
  return booking.customer_name || booking.name || "-";
}

function getGuestCount(booking: AdminBookingRow) {
  return booking.guest_count ?? booking.guests ?? 1;
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
        status,
      )}`}
    >
      {normalizeStatus(status)}
    </span>
  );
}

function MessageBlock({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
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

function QuickUpdateForm({
  booking,
  updateAction,
}: {
  booking: AdminBookingRow;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const allowedStatuses = getAllowedNextStatuses(booking.status);

  return (
    <details className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm md:w-[360px]">
      <summary className="cursor-pointer text-xs font-black text-slate-700">
        Cập nhật nhanh
      </summary>

      <form action={updateAction} className="mt-3 grid gap-2">
        <input type="hidden" name="id" value={booking.id} />

        <select
          name="status"
          defaultValue=""
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
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

        {normalizeStatus(booking.status) === "confirmed" ? (
          <input
            name="total_bill"
            type="number"
            min="0"
            step="1000"
            defaultValue={booking.total_bill || ""}
            placeholder="Tổng bill nếu completed"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        ) : (
          <input type="hidden" name="total_bill" value="0" />
        )}

        <input
          name="cancellation_reason"
          placeholder="Lý do hủy nếu cancelled"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
        />

        <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
          Cập nhật
        </button>
      </form>
    </details>
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
  const [isRefreshing, startRefresh] = useTransition();

  const countByStatus = useMemo(
    () => ({
      all: bookings.length,
      pending: bookings.filter(
        (item) => normalizeStatus(item.status) === "pending",
      ).length,
      confirmed: bookings.filter(
        (item) => normalizeStatus(item.status) === "confirmed",
      ).length,
      completed: bookings.filter(
        (item) => normalizeStatus(item.status) === "completed",
      ).length,
      cancelled: bookings.filter(
        (item) => normalizeStatus(item.status) === "cancelled",
      ).length,
    }),
    [bookings],
  );

  const totalCompletedRevenue = useMemo(
    () =>
      bookings
        .filter((item) => normalizeStatus(item.status) === "completed")
        .reduce((sum, item) => sum + Number(item.total_bill || 0), 0),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    if (activeStatus === "all") return bookings;

    return bookings.filter(
      (booking) => normalizeStatus(booking.status) === activeStatus,
    );
  }, [activeStatus, bookings]);

  const hasLiveBookings = useMemo(
    () =>
      bookings.some((booking) => {
        const status = normalizeStatus(booking.status);
        return status === "pending" || status === "confirmed";
      }),
    [bookings],
  );

  useEffect(() => {
    if (!hasLiveBookings) return;

    const timer = window.setInterval(() => {
      startRefresh(() => {
        router.refresh();
      });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [hasLiveBookings, router]);

  return (
    <div className="relative mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
            Admin Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">
            Quản lý booking
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pending chỉ được confirm/cancel. Confirmed chỉ được completed/cancel.
          </p>
        </div>

        <Link
          href="/dashboard/admin"
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
              {isRefreshing
                ? "Đang đồng bộ dữ liệu booking mới..."
                : "Tab status xử lý trực tiếp trên client, không reload trang."}
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
              {filteredBookings.map((booking) => {
                const locked = isLockedStatus(booking.status);
                const restaurant = booking.restaurants;
                const agent = booking.agent;
                const restaurantName =
                  restaurant?.name || booking.service_name || "Restaurant";

                return (
                  <tr key={booking.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-950">
                        {booking.booking_code || booking.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.created_at
                          ? new Date(booking.created_at).toLocaleString("vi-VN")
                          : "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">
                        {getCustomerName(booking)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.phone || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        WA: {booking.whatsapp || booking.phone || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.email || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">
                        {restaurantName}
                      </p>
                      {restaurant?.slug ? (
                        <Link
                          href={`/restaurants/${restaurant.slug}`}
                          prefetch={false}
                          className="mt-1 inline-flex text-xs font-bold text-amber-700 hover:text-amber-800"
                        >
                          Xem nhà hàng →
                        </Link>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">
                        {booking.booking_date || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.booking_time || "-"} · {getGuestCount(booking)}{" "}
                        khách
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">
                        {getAgentName(agent)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getAgentRef(agent)}
                      </p>
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
                      <p className="font-bold text-slate-950">
                        {formatMoney(booking.total_bill)}đ
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Discount: {formatMoney(booking.customer_discount_amount)}
                        đ
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Platform:{" "}
                        {formatMoney(booking.platform_commission_amount)}đ
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Link
                          href={`/booking/${booking.id}`}
                          prefetch={false}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Chi tiết
                        </Link>

                        {!locked ? (
                          <QuickUpdateForm
                            booking={booking}
                            updateAction={updateAction}
                          />
                        ) : (
                          <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                            Locked
                          </span>
                        )}

                        <form action={deleteAction}>
                          <input type="hidden" name="id" value={booking.id} />
                          <input
                            type="hidden"
                            name="current_status"
                            value={activeStatus}
                          />
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
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Chưa có booking nào trong trạng thái này.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}