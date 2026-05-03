import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import {
  sendBookingCancelledEmails,
  sendBookingCompletedEmails,
  sendBookingConfirmedEmail,
} from "@/lib/email/send-booking-emails";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    success?: string;
    error?: string;
  }>;
};

type BookingRow = {
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
  total_bill?: number | null;
  customer_discount_amount?: number | null;
  platform_commission_amount?: number | null;
  agent_commission_amount?: number | null;
  platform_net_amount?: number | null;
  cancellation_reason?: string | null;
  created_at?: string | null;
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

const FILTERS = [
  { label: "Tất cả", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const;

function normalizeStatus(status?: string | null) {
  if (!status) return "pending";
  if (status === "canceled") return "cancelled";
  return status;
}

function getAllowedNextStatuses(status?: string | null) {
  const value = normalizeStatus(status);

  if (value === "pending") {
    return ["confirmed", "cancelled"];
  }

  if (value === "confirmed") {
    return ["completed", "cancelled"];
  }

  return [];
}

function isValidTransition(oldStatus: string, newStatus: string) {
  return getAllowedNextStatuses(oldStatus).includes(newStatus);
}

function getAgentName(agent?: AgentRow) {
  return agent?.full_name || agent?.name || agent?.email || "-";
}

function getAgentRef(agent?: AgentRow) {
  return (
    agent?.referral_code ||
    agent?.ref_code ||
    agent?.agent_code ||
    agent?.code ||
    "-"
  );
}

function getStatusClass(status?: string | null) {
  const value = normalizeStatus(status);

  if (value === "confirmed") return "bg-blue-50 text-blue-700 border-blue-200";
  if (value === "completed")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "cancelled") return "bg-red-50 text-red-700 border-red-200";

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function formatMoney(value?: number | null) {
  return Number(value || 0).toLocaleString("vi-VN");
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

async function getSupplierEmailForBooking(booking: BookingRow) {
  if (booking.supplier_id) {
    const { data } = await adminClient
      .from("suppliers")
      .select("id, email")
      .eq("id", booking.supplier_id)
      .maybeSingle();

    return data?.email || null;
  }

  if (booking.restaurant_id) {
    const { data: restaurant } = await adminClient
      .from("restaurants")
      .select("id, supplier_id")
      .eq("id", booking.restaurant_id)
      .maybeSingle();

    if (restaurant?.supplier_id) {
      const { data } = await adminClient
        .from("suppliers")
        .select("id, email")
        .eq("id", restaurant.supplier_id)
        .maybeSingle();

      return data?.email || null;
    }
  }

  return null;
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

async function updateBookingStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const status = normalizeStatus(String(formData.get("status") || "pending"));
  const totalBill = Number(formData.get("total_bill") || 0);
  const cancellationReason = String(formData.get("cancellation_reason") || "");

  if (!id) {
    redirect("/dashboard/admin/bookings?error=missing_id");
  }

  const { data: currentBooking, error: currentBookingError } = await adminClient
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (currentBookingError || !currentBooking) {
    redirect(
      `/dashboard/admin/bookings?error=${encodeURIComponent(
        currentBookingError?.message || "Booking not found",
      )}`,
    );
  }

  const booking = currentBooking as BookingRow;
  const oldStatus = normalizeStatus(booking.status);

  if (isLockedStatus(oldStatus)) {
    redirect("/dashboard/admin/bookings?error=status_locked");
  }

  if (status === oldStatus) {
    redirect(`/dashboard/admin/bookings?status=${oldStatus}&success=no_change`);
  }

  if (!isValidTransition(oldStatus, status)) {
    redirect("/dashboard/admin/bookings?error=invalid_status_transition");
  }

  if (status === "completed" && (!totalBill || totalBill <= 0)) {
    redirect("/dashboard/admin/bookings?error=missing_total_bill");
  }

  if (status === "cancelled" && !cancellationReason.trim()) {
    redirect("/dashboard/admin/bookings?error=missing_cancellation_reason");
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, string | number | null> = { status };

  if (status === "confirmed") {
    updatePayload.confirmed_at = now;
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  if (status === "completed") {
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

  if (status === "cancelled") {
    updatePayload.cancelled_at = now;
    updatePayload.cancellation_reason = cancellationReason;
  }

  const { error } = await adminClient
    .from("bookings")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    redirect(`/dashboard/admin/bookings?error=${encodeURIComponent(error.message)}`);
  }

  await adminClient.from("booking_status_logs").insert({
    booking_id: id,
    old_status: oldStatus,
    new_status: status,
    note:
      status === "completed"
        ? `Admin completed booking. Total bill: ${totalBill}`
        : status === "cancelled"
          ? `Admin cancelled booking. Reason: ${cancellationReason || "-"}`
          : "Admin updated booking status.",
    created_at: now,
  });

  if (oldStatus === "pending" && status === "confirmed") {
    await sendBookingConfirmedEmail({
      customerEmail: booking.email,
      customerName: booking.customer_name || booking.name || "Customer",
      restaurantName: booking.service_name || "Restaurant",
      bookingCode: booking.booking_code || booking.id,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
    });
  }

  if (oldStatus === "confirmed" && status === "completed") {
    const supplierEmail = await getSupplierEmailForBooking(booking);
    const amounts = calculateCommission(totalBill);

    await sendBookingCompletedEmails({
      customerEmail: booking.email,
      supplierEmail,
      customerName: booking.customer_name || booking.name || "Customer",
      restaurantName: booking.service_name || "Restaurant",
      bookingCode: booking.booking_code || booking.id,
      totalBill,
      customerDiscountAmount: amounts.customerDiscountAmount,
      platformCommissionAmount: amounts.platformCommissionAmount,
      agentCommissionAmount: amounts.agentCommissionAmount,
      platformNetAmount: amounts.platformNetAmount,
    });
  }

  if (oldStatus === "confirmed" && status === "cancelled") {
    const [supplierEmail, agentEmail] = await Promise.all([
      getSupplierEmailForBooking(booking),
      getAgentEmail(booking.agent_id),
    ]);

    await sendBookingCancelledEmails({
      customerEmail: booking.email,
      supplierEmail,
      agentEmail,
      customerName: booking.customer_name || booking.name || "Customer",
      restaurantName: booking.service_name || "Restaurant",
      bookingCode: booking.booking_code || booking.id,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
      cancellationReason,
    });
  }

  revalidatePath("/dashboard/admin/bookings");
  revalidatePath(`/booking/${id}`);
  redirect(`/dashboard/admin/bookings?status=${status}&success=updated`);
}

async function deleteBooking(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const currentStatus = String(formData.get("current_status") || "all");

  const { error } = await adminClient.from("bookings").delete().eq("id", id);

  if (error) {
    redirect(`/dashboard/admin/bookings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/bookings");
  redirect(`/dashboard/admin/bookings?status=${currentStatus}&success=deleted`);
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const activeStatus = normalizeStatus(resolvedSearchParams?.status || "all");

  const { data: allBookingsData, error: countError } = await adminClient
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (countError) {
    throw new Error(countError.message);
  }

  const allBookings = ((allBookingsData || []) as BookingRow[]).map((booking) => ({
    ...booking,
    status: normalizeStatus(booking.status),
  }));

  const bookings =
    activeStatus === "all"
      ? allBookings
      : allBookings.filter(
          (booking) => normalizeStatus(booking.status) === activeStatus,
        );

  const countByStatus = {
    all: allBookings.length,
    pending: allBookings.filter((item) => normalizeStatus(item.status) === "pending")
      .length,
    confirmed: allBookings.filter(
      (item) => normalizeStatus(item.status) === "confirmed",
    ).length,
    completed: allBookings.filter(
      (item) => normalizeStatus(item.status) === "completed",
    ).length,
    cancelled: allBookings.filter(
      (item) => normalizeStatus(item.status) === "cancelled",
    ).length,
  };

  const totalCompletedRevenue = allBookings
    .filter((item) => normalizeStatus(item.status) === "completed")
    .reduce((sum, item) => sum + Number(item.total_bill || 0), 0);

  const restaurantIds = Array.from(
    new Set(bookings.map((item) => item.restaurant_id).filter(Boolean)),
  ) as string[];

  const agentIds = Array.from(
    new Set(bookings.map((item) => item.agent_id).filter(Boolean)),
  ) as string[];

  const { data: restaurantsData } = restaurantIds.length
    ? await adminClient
        .from("restaurants")
        .select("id, name, slug, supplier_id")
        .in("id", restaurantIds)
    : { data: [] };

  const { data: agentsData } = agentIds.length
    ? await adminClient.from("agents").select("*").in("id", agentIds)
    : { data: [] };

  const restaurants = (restaurantsData || []) as RestaurantRow[];
  const agents = (agentsData || []) as AgentRow[];

  const restaurantMap = new Map(restaurants.map((item) => [item.id, item]));
  const agentMap = new Map(agents.map((item) => [item.id, item]));

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
                Dữ liệu cập nhật theo trạng thái hiện tại.
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((filter) => {
                const selected = activeStatus === filter.value;
                const count = countByStatus[filter.value];

                return (
                  <Link
                    key={filter.value}
                    href={`/dashboard/admin/bookings?status=${filter.value}`}
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

        {resolvedSearchParams?.success === "deleted" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            Đã xóa booking thành công.
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
                {bookings.map((booking) => {
                  const locked = isLockedStatus(booking.status);
                  const allowedStatuses = getAllowedNextStatuses(booking.status);

                  const restaurant = booking.restaurant_id
                    ? restaurantMap.get(booking.restaurant_id)
                    : undefined;

                  const agent = booking.agent_id
                    ? agentMap.get(booking.agent_id)
                    : undefined;

                  const restaurantName =
                    restaurant?.name || booking.service_name || "Restaurant";

                  const customerName = booking.customer_name || booking.name || "-";

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
                        <p className="font-bold text-slate-950">{customerName}</p>
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
                        <p className="font-bold text-slate-950">{restaurantName}</p>
                        {restaurant?.slug && (
                          <Link
                            href={`/restaurants/${restaurant.slug}`}
                            className="mt-1 inline-flex text-xs font-bold text-amber-700 hover:text-amber-800"
                          >
                            Xem nhà hàng →
                          </Link>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-950">
                          {booking.booking_date || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {booking.booking_time || "-"} · {booking.guests || 1} khách
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
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                            booking.status,
                          )}`}
                        >
                          {normalizeStatus(booking.status)}
                        </span>

                        {normalizeStatus(booking.status) === "cancelled" && (
                          <p className="mt-2 max-w-[180px] text-xs text-red-600">
                            {booking.cancellation_reason || "Chưa nhập lý do"}
                          </p>
                        )}

                        {normalizeStatus(booking.status) === "completed" && (
                          <p className="mt-2 text-xs font-bold text-emerald-700">
                            Total: {formatMoney(booking.total_bill)}đ
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-950">
                          {formatMoney(booking.total_bill)}đ
                        </p>
                        <p className="mt-1 text-xs text-emerald-700">
                          Discount: {formatMoney(booking.customer_discount_amount)}đ
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Platform: {formatMoney(booking.platform_commission_amount)}đ
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <Link
                            href={`/booking/${booking.id}`}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Chi tiết
                          </Link>

                          {!locked ? (
                            <details className="w-[360px] rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm">
                              <summary className="cursor-pointer text-xs font-black text-slate-700">
                                Cập nhật nhanh
                              </summary>

                              <form action={updateBookingStatus} className="mt-3 grid gap-2">
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

                                {normalizeStatus(booking.status) === "confirmed" && (
                                  <input
                                    name="total_bill"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    defaultValue={booking.total_bill || ""}
                                    placeholder="Tổng bill nếu completed"
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
                                  />
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
                          ) : (
                            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                              Locked
                            </span>
                          )}

                          <form action={deleteBooking}>
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

                {!bookings.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Chưa có booking nào trong trạng thái này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}