import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSupplier } from "@/lib/suppliers/get-current-supplier";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SupplierBookingStatusForm } from "@/components/dashboard/supplier-booking-status-form";
import { BookingStatusTimeline } from "@/components/dashboard/booking-status-timeline";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
type FilterStatus = "all" | BookingStatus;

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    booking?: string;
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

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function normalizeStatus(value?: string): FilterStatus {
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

function getFilterHref(status: FilterStatus) {
  if (status === "all") return "/dashboard/supplier/bookings";
  return `/dashboard/supplier/bookings?status=${status}`;
}

function getDetailHref(status: FilterStatus, bookingId: string) {
  const params = new URLSearchParams();

  if (status !== "all") {
    params.set("status", status);
  }

  params.set("booking", bookingId);

  return `/dashboard/supplier/bookings?${params.toString()}`;
}

function getRestaurant(booking: { restaurants: unknown }) {
  return booking.restaurants as RestaurantInfo | null;
}

function getLogs(booking: { booking_status_logs: unknown }) {
  return (((booking.booking_status_logs as BookingLog[] | null) ?? []) || [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

export default async function SupplierBookingsPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const activeStatus = normalizeStatus(resolvedSearchParams?.status);
  const selectedBookingId = resolvedSearchParams?.booking;

  const { supplier } = await getCurrentSupplier();
  const supabase = await createClient();

  const { data: bookings, error } = await supabase
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

  const allBookings = bookings ?? [];

  const filteredBookings =
    activeStatus === "all"
      ? allBookings
      : allBookings.filter((booking) => booking.status === activeStatus);

  const selectedBooking =
    filteredBookings.find((booking) => booking.id === selectedBookingId) ||
    filteredBookings[0] ||
    null;

  const totalCompletedRevenue = allBookings
    .filter((booking) => booking.status === "completed")
    .reduce((sum, booking) => sum + Number(booking.total_bill ?? 0), 0);

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

  const filters: { label: string; value: FilterStatus; count: number }[] = [
    { label: "Tất cả", value: "all", count: counts.all },
    { label: "Pending", value: "pending", count: counts.pending },
    { label: "Confirmed", value: "confirmed", count: counts.confirmed },
    { label: "Completed", value: "completed", count: counts.completed },
    { label: "Cancelled", value: "cancelled", count: counts.cancelled },
  ];

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
              Xem booking, lọc trạng thái và cập nhật trạng thái theo đúng flow.
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
                Doanh thu completed: {formatMoney(totalCompletedRevenue)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Dữ liệu cập nhật theo trạng thái hiện tại.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const active = activeStatus === filter.value;

                return (
                  <Link
                    key={filter.value}
                    href={getFilterHref(filter.value)}
                    className={
                      active
                        ? "rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
                        : "rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
                    }
                  >
                    {filter.label} ({filter.count})
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="hidden grid-cols-[1.05fr_1fr_1fr_90px_110px_110px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-4 text-xs font-black uppercase tracking-wide text-slate-500 lg:grid">
              <span>Booking</span>
              <span>Khách</span>
              <span>Nhà hàng</span>
              <span>Số khách</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="p-8 text-center text-sm font-semibold text-slate-500">
                Không có booking nào ở trạng thái này.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredBookings.map((booking) => {
                  const restaurant = getRestaurant(booking);
                  const active = selectedBooking?.id === booking.id;

                  return (
                    <article
                      key={booking.id}
                      className={
                        active
                          ? "bg-amber-50/70 px-4 py-5"
                          : "bg-white px-4 py-5 hover:bg-slate-50"
                      }
                    >
                      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr_1fr_90px_110px_110px] lg:items-start">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black leading-6 text-slate-950">
                            {booking.booking_code}
                          </p>
                          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                            {booking.booking_date || "-"}
                            <br />
                            {booking.booking_time || "-"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            {booking.customer_full_name || "-"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {booking.customer_phone || "-"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {booking.customer_email || "-"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-slate-950">
                            {restaurant?.name || "-"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {restaurant?.city || "-"}
                          </p>
                        </div>

                        <p className="text-sm font-bold text-slate-700">
                          <span className="lg:hidden">Số khách: </span>
                          {booking.guest_count ?? 0}
                        </p>

                        <div>
                          <StatusBadge status={booking.status as BookingStatus} />
                        </div>

                        <Link
                          href={getDetailHref(activeStatus, booking.id)}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 lg:justify-self-end"
                        >
                          Chi tiết
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="xl:sticky xl:top-28 xl:h-fit">
            {selectedBooking ? (
              <BookingDetailPanel booking={selectedBooking} />
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

function BookingDetailPanel({ booking }: { booking: any }) {
  const restaurant = getRestaurant(booking);
  const logs = getLogs(booking);

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
        <Info label="Khách hàng" value={booking.customer_full_name || "-"} />
        <Info label="Email" value={booking.customer_email || "-"} />
        <Info label="Phone" value={booking.customer_phone || "-"} />
        <Info label="Whatsapp" value={booking.customer_whatsapp || "-"} />
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
          value={`${booking.booking_date || "-"} · ${booking.booking_time || "-"}`}
        />
        <Info label="Số khách" value={String(booking.guest_count ?? 0)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MoneyInfo label="Total bill" value={booking.total_bill} />
        <MoneyInfo
          label="Customer off 5%"
          value={booking.customer_discount_amount}
        />
        <MoneyInfo
          label="Platform 10%"
          value={booking.platform_commission_amount}
        />
        <MoneyInfo
          label="Agent payout 5%"
          value={booking.agent_commission_amount}
        />
        <MoneyInfo
          label="Platform net 5%"
          value={booking.platform_net_amount}
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
        <h3 className="mb-3 text-sm font-black text-slate-950">
          Cập nhật trạng thái
        </h3>

        <SupplierBookingStatusForm
          booking={{
            id: booking.id,
            status: booking.status as BookingStatus,
            total_bill: Number(booking.total_bill ?? 0),
            supplier_note: booking.supplier_note,
            cancellation_reason: booking.cancellation_reason,
          }}
        />
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

function MoneyInfo({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">
        {formatMoney(value)}
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