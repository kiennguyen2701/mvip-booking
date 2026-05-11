"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateSupplierBookingStatus,
  type SupplierActionState,
} from "@/app/dashboard/supplier/actions";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { BookingStatusTimeline } from "@/components/dashboard/booking-status-timeline";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

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
  city?: string;
  address?: string;
};

type ActionBooking = {
  id: string;
  booking_code: string | null;

  customer_full_name: string | null;
  customer_name: string | null;
  name?: string | null;

  customer_email?: string | null;
  email?: string | null;

  customer_phone: string | null;
  phone: string | null;

  customer_whatsapp?: string | null;
  whatsapp?: string | null;

  service_name?: string | null;

  booking_date: string | null;
  booking_time: string | null;
  guest_count: number | null;
  guests: number | null;

  status: BookingStatus | string | null;
  total_bill: number | null;

  customer_discount_amount?: number | null;
  platform_commission_amount?: number | null;
  agent_commission_amount?: number | null;
  platform_net_amount?: number | null;

  note?: string | null;
  supplier_note?: string | null;
  cancellation_reason?: string | null;

  restaurants: RestaurantInfo | null;
  booking_status_logs?: BookingLog[] | null;
};

const initialState: SupplierActionState = {
  success: false,
  message: "",
};

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

function getCustomerName(booking: ActionBooking) {
  return (
    booking.customer_full_name ||
    booking.customer_name ||
    booking.name ||
    "Customer"
  );
}

function getCustomerEmail(booking: ActionBooking) {
  return booking.customer_email || booking.email || "-";
}

function getCustomerPhone(booking: ActionBooking) {
  return booking.customer_phone || booking.phone || "-";
}

function getCustomerWhatsapp(booking: ActionBooking) {
  return booking.customer_whatsapp || booking.whatsapp || "-";
}

function getGuestCount(booking: ActionBooking) {
  return booking.guest_count ?? booking.guests ?? 1;
}

function formatMoney(value?: number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getAgentPlatformCommissionAmount(booking: ActionBooking) {
  return Number(
    booking.platform_commission_amount ??
      (Number(booking.total_bill ?? 0) > 0
        ? Number(booking.total_bill ?? 0) * 0.1
        : 0),
  );
}

function getLogs(booking: ActionBooking) {
  return ((booking.booking_status_logs || []) as BookingLog[])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function MoneyInfo({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">
        {formatMoney(value)}
      </p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-slate-900">{value}</p>
    </div>
  );
}

function BookingActionForm({ booking }: { booking: ActionBooking }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateSupplierBookingStatus,
    initialState,
  );

  const currentStatus = normalizeStatus(booking.status);
  const allowedStatuses = getAllowedNextStatuses(currentStatus);
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [totalBill, setTotalBill] = useState(String(booking.total_bill ?? ""));

  const showTotalBill = status === "completed";
  const showCancelReason = status === "cancelled";

  useEffect(() => {
    if (!state.success) return;

    const timer = window.setTimeout(() => {
      router.refresh();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [router, state.success]);

  if (isLockedStatus(currentStatus)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500">
        Booking đã {currentStatus} nên không thể cập nhật tiếp.
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="bookingId" value={booking.id} />

      <label className="grid gap-2">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
          Trạng thái tiếp theo
        </span>

        <select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as BookingStatus)}
          required
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
        >
          <option value="" disabled>
            Chọn trạng thái
          </option>

          {allowedStatuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
          Ghi chú supplier
        </span>

        <input
          name="supplierNote"
          defaultValue={booking.supplier_note || ""}
          placeholder="Nhập ghi chú nếu có"
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-amber-400"
        />
      </label>

      {showTotalBill ? (
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Tổng bill khi completed
          </span>

          <input
            name="totalBill"
            type="number"
            min="0"
            step="1000"
            value={totalBill}
            onChange={(event) => setTotalBill(event.target.value)}
            placeholder="VD: 3200000"
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-amber-400"
          />

          <span className="text-xs font-semibold text-slate-500">
            Hệ thống sẽ tự tính Customer off 5% và Agent + Platform 10%.
          </span>
        </label>
      ) : (
        <input type="hidden" name="totalBill" value="0" />
      )}

      {showCancelReason ? (
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Lý do hủy
          </span>

          <input
            name="cancellationReason"
            defaultValue={booking.cancellation_reason || ""}
            placeholder="Nhập lý do nếu hủy booking"
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-amber-400"
          />
        </label>
      ) : (
        <input type="hidden" name="cancellationReason" value="" />
      )}

      {state.message ? (
        <div
          className={
            state.success
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
              : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          }
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Đang cập nhật..." : "Cập nhật trạng thái"}
      </button>
    </form>
  );
}

function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: ActionBooking;
  onClose: () => void;
}) {
  const restaurant = booking.restaurants;
  const logs = getLogs(booking);

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 cursor-default"
        aria-label="Close booking detail"
      />

      <section className="relative z-10 mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur md:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Booking Detail
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {booking.booking_code || booking.id}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={normalizeStatus(booking.status)} />

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid gap-5 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                Thông tin booking
              </h3>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info label="Khách hàng" value={getCustomerName(booking)} />
                <Info label="Email" value={getCustomerEmail(booking)} />
                <Info label="Phone" value={getCustomerPhone(booking)} />
                <Info label="Whatsapp" value={getCustomerWhatsapp(booking)} />
                <Info
                  label="Nhà hàng"
                  value={restaurant?.name || booking.service_name || "-"}
                />
                <Info
                  label="Địa điểm"
                  value={
                    [restaurant?.city, restaurant?.address]
                      .filter(Boolean)
                      .join(" · ") || "-"
                  }
                />
                <Info label="Ngày" value={booking.booking_date || "-"} />
                <Info label="Giờ" value={booking.booking_time || "-"} />
                <Info label="Số khách" value={String(getGuestCount(booking))} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                Bill & Commission
              </h3>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MoneyInfo label="Total bill" value={booking.total_bill} />
                <MoneyInfo
                  label="Customer off 5%"
                  value={booking.customer_discount_amount}
                />
                <MoneyInfo
                  label="Agent + Platform 10%"
                  value={getAgentPlatformCommissionAmount(booking)}
                />
              </div>
            </section>

            {booking.note ? (
              <TextBlock label="Ghi chú khách" value={booking.note} />
            ) : null}

            {booking.supplier_note ? (
              <TextBlock
                label="Ghi chú supplier"
                value={booking.supplier_note}
              />
            ) : null}

            {booking.cancellation_reason ? (
              <TextBlock
                label="Lý do hủy"
                value={booking.cancellation_reason}
              />
            ) : null}

            <BookingStatusTimeline logs={logs} />
          </div>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4">
              <h3 className="text-base font-black text-slate-950">
                Cập nhật trạng thái
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                Pending chỉ được Confirmed/Cancelled. Confirmed chỉ được
                Completed/Cancelled.
              </p>

              <div className="mt-4">
                <BookingActionForm booking={booking} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-black text-slate-950">Quick Rule</h3>

              <div className="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-600">
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

export function SupplierDashboardActionBookings({
  bookings,
  totalBookings,
}: {
  bookings: ActionBooking[];
  totalBookings: number;
}) {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<ActionBooking | null>(
    null,
  );
  const [isRefreshing, startRefresh] = useTransition();

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
    <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Booking cần thao tác
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isRefreshing
              ? "Đang đồng bộ dữ liệu booking mới..."
              : "Bấm Xử lý để mở popup chi tiết ngay, không reload trang."}
          </p>
        </div>

        <Link
          href="/dashboard/supplier/bookings"
          prefetch={false}
          className="w-fit rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          Xem tất cả booking ({totalBookings}) →
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
          Hiện không có booking nào cần thao tác.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Booking</th>
                <th className="px-5 py-3">Khách</th>
                <th className="px-5 py-3">Nhà hàng</th>
                <th className="px-5 py-3">Ngày giờ</th>
                <th className="px-5 py-3">Số khách</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {bookings.map((booking) => {
                const status = normalizeStatus(booking.status);

                return (
                  <tr key={booking.id} className="hover:bg-amber-50/40">
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">
                        {booking.booking_code || booking.id.slice(0, 8)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-950">
                        {getCustomerName(booking)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getCustomerPhone(booking)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-950">
                        {booking.restaurants?.name || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.restaurants?.city || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-950">
                        {booking.booking_date || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.booking_time || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-700">
                      {getGuestCount(booking)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
                      >
                        Xử lý
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedBooking ? (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      ) : null}
    </section>
  );
}