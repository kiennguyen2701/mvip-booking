import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSupplier } from "@/lib/suppliers/get-current-supplier";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { BookingStatusTimeline } from "@/components/dashboard/booking-status-timeline";
import {
  sendBookingCancelledEmails,
  sendBookingCompletedEmails,
  sendBookingConfirmedEmail,
} from "@/lib/email/send-booking-emails";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
type FilterStatus = "all" | BookingStatus;

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    booking?: string;
    success?: string;
    error?: string;
  }>;
};

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
  restaurants?: unknown;
  booking_status_logs?: unknown;
};

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

function normalizeFilter(value?: string | null): FilterStatus {
  if (
    value === "pending" ||
    value === "confirmed" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "all";
}

function getAllowedNextStatuses(status?: string | null): BookingStatus[] {
  const value = normalizeStatus(status);

  if (value === "pending") return ["confirmed", "cancelled"];
  if (value === "confirmed") return ["completed", "cancelled"];

  return [];
}

function isValidTransition(oldStatus: string, newStatus: string) {
  return getAllowedNextStatuses(oldStatus).includes(
    newStatus as BookingStatus,
  );
}

function isLockedStatus(status?: string | null) {
  const value = normalizeStatus(status);
  return value === "completed" || value === "cancelled";
}

function calculateCommission(totalBill: number) {
  return {
    customerDiscountAmount: totalBill * 0.05,
    platformCommissionAmount: totalBill * 0.1,
    agentCommissionAmount: totalBill * 0.05,
    platformNetAmount: totalBill * 0.05,
  };
}

function formatMoney(value?: number | null) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function getFilterHref(status: FilterStatus) {
  if (status === "all") return "/dashboard/supplier/bookings";
  return `/dashboard/supplier/bookings?status=${status}`;
}

function getDetailHref(status: FilterStatus, bookingId: string) {
  const params = new URLSearchParams();

  if (status !== "all") params.set("status", status);
  params.set("booking", bookingId);

  return `/dashboard/supplier/bookings?${params.toString()}`;
}

function getRestaurant(booking: { restaurants?: unknown }) {
  return booking.restaurants as RestaurantInfo | null;
}

function getLogs(booking: { booking_status_logs?: unknown }) {
  return (((booking.booking_status_logs as BookingLog[] | null) ?? []) || [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

function getCustomerName(booking: BookingRow) {
  return (
    booking.customer_full_name ||
    booking.customer_name ||
    booking.name ||
    "Customer"
  );
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

async function getRestaurantName(booking: BookingRow) {
  if (booking.service_name) return booking.service_name;

  if (!booking.restaurant_id) return "Restaurant";

  const { data } = await adminClient
    .from("restaurants")
    .select("id, name")
    .eq("id", booking.restaurant_id)
    .maybeSingle();

  return data?.name || "Restaurant";
}

async function getAgentEmail(agentId?: string | null) {
  if (!agentId) return null;

  const { data } = await adminClient
    .from("agents")
    .select("id, email")
    .eq("id", agentId)
    .maybeSingle();

  return data?.email || null;
}

async function updateSupplierBookingStatus(formData: FormData) {
  "use server";

  const { supplier } = await getCurrentSupplier();

  const id = String(formData.get("id") || "").trim();
  const nextStatus = normalizeStatus(String(formData.get("status") || ""));
  const currentStatusFilter = String(formData.get("current_status") || "all");
  const totalBill = Number(formData.get("total_bill") || 0);
  const cancellationReason = String(
    formData.get("cancellation_reason") || "",
  ).trim();

  const redirectBase = `/dashboard/supplier/bookings?status=${currentStatusFilter}`;

  if (!id) {
    redirect(`${redirectBase}&error=missing_id`);
  }

  const { data: currentBooking, error: currentBookingError } = await adminClient
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("supplier_id", supplier.id)
    .maybeSingle();

  if (currentBookingError || !currentBooking) {
    redirect(
      `${redirectBase}&error=${encodeURIComponent(
        currentBookingError?.message || "Booking not found",
      )}`,
    );
  }

  const booking = currentBooking as BookingRow;
  const oldStatus = normalizeStatus(booking.status);

  if (isLockedStatus(oldStatus)) {
    redirect(`${redirectBase}&error=status_locked`);
  }

  if (nextStatus === oldStatus) {
    redirect(`${redirectBase}&success=no_change`);
  }

  if (!isValidTransition(oldStatus, nextStatus)) {
    redirect(`${redirectBase}&error=invalid_status_transition`);
  }

  if (nextStatus === "completed" && (!totalBill || totalBill <= 0)) {
    redirect(`${redirectBase}&error=missing_total_bill`);
  }

  if (nextStatus === "cancelled" && !cancellationReason) {
    redirect(`${redirectBase}&error=missing_cancellation_reason`);
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, string | number | null> = {
    status: nextStatus,
    updated_at: now,
  };

  if (nextStatus === "confirmed") {
    updatePayload.confirmed_at = now;
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  if (nextStatus === "completed") {
    const amounts = calculateCommission(totalBill);

    updatePayload.completed_at = now;
    updatePayload.total_bill = totalBill;
    updatePayload.customer_discount_amount = amounts.customerDiscountAmount;
    updatePayload.platform_commission_amount = amounts.platformCommissionAmount;
    updatePayload.agent_commission_amount = amounts.agentCommissionAmount;
    updatePayload.platform_net_amount = amounts.platformNetAmount;
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  if (nextStatus === "cancelled") {
    updatePayload.cancelled_at = now;
    updatePayload.cancellation_reason = cancellationReason;
  }

  const { error } = await adminClient
    .from("bookings")
    .update(updatePayload)
    .eq("id", id)
    .eq("supplier_id", supplier.id);

  if (error) {
    redirect(`${redirectBase}&error=${encodeURIComponent(error.message)}`);
  }

  await adminClient.from("booking_status_logs").insert({
    booking_id: id,
    old_status: oldStatus,
    new_status: nextStatus,
    changed_by_role: "supplier",
    note:
      nextStatus === "completed"
        ? `Supplier completed booking. Total bill: ${totalBill}`
        : nextStatus === "cancelled"
          ? `Supplier cancelled booking. Reason: ${cancellationReason || "-"}`
          : "Supplier confirmed booking.",
    created_at: now,
  });

  const restaurantName = await getRestaurantName(booking);
  const customerEmail = getCustomerEmail(booking);

  if (oldStatus === "pending" && nextStatus === "confirmed") {
    await sendBookingConfirmedEmail({
      customerEmail,
      customerName: getCustomerName(booking),
      restaurantName,
      bookingCode: booking.booking_code || booking.id,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
    });
  }

  if (oldStatus === "confirmed" && nextStatus === "completed") {
    const amounts = calculateCommission(totalBill);

    await sendBookingCompletedEmails({
      customerEmail,
      supplierEmail: null,
      customerName: getCustomerName(booking),
      restaurantName,
      bookingCode: booking.booking_code || booking.id,
      totalBill,
      customerDiscountAmount: amounts.customerDiscountAmount,
      platformCommissionAmount: amounts.platformCommissionAmount,
      agentCommissionAmount: amounts.agentCommissionAmount,
      platformNetAmount: amounts.platformNetAmount,
    });
  }

  if (oldStatus === "confirmed" && nextStatus === "cancelled") {
    const agentEmail = await getAgentEmail(booking.agent_id);

    await sendBookingCancelledEmails({
      customerEmail,
      supplierEmail: null,
      agentEmail,
      customerName: getCustomerName(booking),
      restaurantName,
      bookingCode: booking.booking_code || booking.id,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
      cancellationReason,
    });
  }

  revalidatePath("/dashboard/supplier/bookings");
  revalidatePath("/dashboard/supplier");
  revalidatePath("/dashboard/admin/bookings");
  revalidatePath("/dashboard/customer");
  revalidatePath(`/booking/${id}`);

  redirect(
    `/dashboard/supplier/bookings?status=${nextStatus}&booking=${id}&success=updated`,
  );
}

export default async function SupplierBookingsPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const activeStatus = normalizeFilter(resolvedSearchParams?.status);
  const selectedBookingId = resolvedSearchParams?.booking;

  const { supplier } = await getCurrentSupplier();
  const supabase = await createClient();

  const { data: bookingsData, error } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_code,
      customer_full_name,
      customer_email,
      customer_phone,
      customer_whatsapp,
      booking_date,
      booking_time,
      guest_count,
      note,
      supplier_note,
      cancellation_reason,
      status,
      total_bill,
      customer_discount_amount,
      platform_commission_amount,
      agent_commission_amount,
      platform_net_amount,
      restaurants(id,name,city,address),
      booking_status_logs(
        id,
        old_status,
        new_status,
        changed_by_role,
        note,
        created_at
      )
    `)
    .eq("supplier_id", supplier.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#fbf7ef] px-4 py-5 md:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <h1 className="text-xl font-black">Lỗi tải danh sách booking</h1>
          <p className="mt-2 text-sm">{error.message}</p>
        </div>
      </main>
    );
  }

  const allBookings = ((bookingsData || []) as BookingRow[]).map((booking) => ({
    ...booking,
    status: normalizeStatus(booking.status),
  }));

  const filteredBookings =
    activeStatus === "all"
      ? allBookings
      : allBookings.filter(
          (booking) => normalizeStatus(booking.status) === activeStatus,
        );

  const selectedBooking =
    filteredBookings.find((booking) => booking.id === selectedBookingId) ||
    filteredBookings[0] ||
    null;

  const counts = {
    all: allBookings.length,
    pending: allBookings.filter((booking) => booking.status === "pending")
      .length,
    confirmed: allBookings.filter((booking) => booking.status === "confirmed")
      .length,
    completed: allBookings.filter((booking) => booking.status === "completed")
      .length,
    cancelled: allBookings.filter((booking) => booking.status === "cancelled")
      .length,
  };

  const totalCompletedRevenue = allBookings
    .filter((booking) => booking.status === "completed")
    .reduce((sum, booking) => sum + Number(booking.total_bill ?? 0), 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-4 py-5 md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(214,155,56,0.11)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Supplier Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">
              Quản lý booking
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Pending chỉ được confirm/cancel. Confirmed chỉ được completed/cancel.
            </p>
          </div>

          <Link
            href="/dashboard/supplier"
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
                Dữ liệu cập nhật theo trạng thái hiện tại.
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((filter) => {
                const selected = activeStatus === filter.value;
                const count = counts[filter.value];

                return (
                  <Link
                    key={filter.value}
                    href={getFilterHref(filter.value)}
                    scroll={false}
                    prefetch={false}
                    className={
                      selected
                        ? "whitespace-nowrap rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition"
                        : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                    }
                  >
                    {filter.label} ({count})
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {resolvedSearchParams?.success === "updated" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            Cập nhật trạng thái booking thành công.
          </div>
        )}

        {resolvedSearchParams?.success === "no_change" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">
            Trạng thái không thay đổi.
          </div>
        )}

        {resolvedSearchParams?.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {resolvedSearchParams.error === "missing_total_bill"
              ? "Khi chuyển sang completed, anh cần nhập tổng bill."
              : resolvedSearchParams.error === "status_locked"
                ? "Booking đã completed hoặc cancelled nên không thể đổi trạng thái nữa."
                : resolvedSearchParams.error === "invalid_status_transition"
                  ? "Luồng trạng thái không hợp lệ. Pending chỉ được Confirmed/Cancelled. Confirmed chỉ được Completed/Cancelled."
                  : resolvedSearchParams.error === "missing_cancellation_reason"
                    ? "Khi hủy booking, anh cần nhập lý do hủy."
                    : decodeURIComponent(resolvedSearchParams.error)}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Khách</th>
                    <th className="px-4 py-3">Nhà hàng</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((booking) => {
                    const restaurant = getRestaurant(booking);
                    const active = selectedBooking?.id === booking.id;

                    return (
                      <tr
                        key={booking.id}
                        className={
                          active
                            ? "bg-amber-50/70 align-top"
                            : "align-top hover:bg-slate-50/70"
                        }
                      >
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-950">
                            {booking.booking_code || booking.id.slice(0, 8)}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-950">
                            {getCustomerName(booking)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getCustomerPhone(booking)}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-950">
                            {restaurant?.name || "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {restaurant?.city || "-"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-950">
                            {booking.booking_date || "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {booking.booking_time || "-"} ·{" "}
                            {getGuestCount(booking)} khách
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge
                            status={booking.status as BookingStatus}
                          />
                        </td>

                        <td className="px-4 py-4 text-right">
                          <Link
                            href={getDetailHref(activeStatus, booking.id)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })}

                  {!filteredBookings.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Không có booking nào ở trạng thái này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="xl:sticky xl:top-28 xl:h-fit">
            {selectedBooking ? (
              <BookingDetailPanel
                booking={selectedBooking}
                activeStatus={activeStatus}
              />
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
                Chọn một booking để xem chi tiết.
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function BookingDetailPanel({
  booking,
  activeStatus,
}: {
  booking: BookingRow;
  activeStatus: FilterStatus;
}) {
  const restaurant = getRestaurant(booking);
  const logs = getLogs(booking);
  const locked = isLockedStatus(booking.status);
  const allowedStatuses = getAllowedNextStatuses(booking.status);

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
            Booking Detail
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            {booking.booking_code}
          </h2>
        </div>

        <StatusBadge status={booking.status as BookingStatus} />
      </div>

      <div className="grid gap-3">
        <Info label="Khách hàng" value={getCustomerName(booking)} />
        <Info label="Email" value={getCustomerEmail(booking) || "-"} />
        <Info label="Phone" value={getCustomerPhone(booking)} />
        <Info label="Whatsapp" value={getCustomerWhatsapp(booking)} />
        <Info label="Nhà hàng" value={restaurant?.name || "-"} />
        <Info
          label="Địa điểm"
          value={
            [restaurant?.city, restaurant?.address].filter(Boolean).join(" · ") ||
            "-"
          }
        />
        <Info
          label="Ngày giờ"
          value={`${booking.booking_date || "-"} · ${
            booking.booking_time || "-"
          }`}
        />
        <Info label="Số khách" value={String(getGuestCount(booking))} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MoneyInfo label="Total bill" value={booking.total_bill} />
        <MoneyInfo
          label="Customer off 5%"
          value={booking.customer_discount_amount}
        />
        <MoneyInfo
          label="Agent payout 5%"
          value={booking.agent_commission_amount}
        />
      </div>

      {booking.note ? (
        <TextBlock label="Ghi chú khách" value={booking.note} />
      ) : null}

      {booking.supplier_note ? (
        <TextBlock label="Ghi chú supplier" value={booking.supplier_note} />
      ) : null}

      {booking.cancellation_reason ? (
        <TextBlock label="Lý do hủy" value={booking.cancellation_reason} />
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-1 text-sm font-black text-slate-950">
          Cập nhật trạng thái
        </h3>

        <p className="mb-4 text-xs leading-5 text-slate-500">
          Pending chỉ được Confirmed/Cancelled. Confirmed chỉ được
          Completed/Cancelled.
        </p>

        {locked ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500">
            Booking đã {normalizeStatus(booking.status)} nên không thể cập nhật
            tiếp.
          </div>
        ) : (
          <form action={updateSupplierBookingStatus} className="grid gap-3">
            <input type="hidden" name="id" value={booking.id} />
            <input type="hidden" name="current_status" value={activeStatus} />

            <select
              name="status"
              defaultValue=""
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
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

            {normalizeStatus(booking.status) === "confirmed" && (
              <input
                name="total_bill"
                type="number"
                min="0"
                step="1000"
                defaultValue={booking.total_bill || ""}
                placeholder="Tổng bill nếu completed"
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-amber-400"
              />
            )}

            <input
              name="cancellation_reason"
              placeholder="Lý do hủy nếu cancelled"
              defaultValue={booking.cancellation_reason || ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-amber-400"
            />

            <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">
              Cập nhật trạng thái
            </button>
          </form>
        )}
      </div>

      <BookingStatusTimeline logs={logs} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-slate-900">{value}</p>
    </div>
  );
}

function MoneyInfo({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">
        {formatMoney(value)}đ
      </p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-slate-900">{value}</p>
    </div>
  );
}