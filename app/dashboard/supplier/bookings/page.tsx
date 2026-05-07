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

function getLogs(booking: { booking_status_logs: unknown }) {
  return (((booking.booking_status_logs as BookingLog[] | null) ?? []) || [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

function getRestaurant(booking: { restaurants: unknown }) {
  return booking.restaurants as RestaurantInfo | null;
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
      <div className="space-y-6 px-4 py-6 md:px-6">
        <div>
          <p className="text-sm text-gray-500">Supplier / Bookings</p>
          <h1 className="mt-1 text-3xl font-semibold text-gray-900">
            Quản lý booking
          </h1>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Lỗi tải danh sách booking: {error.message}
        </div>
      </div>
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
    { label: "All", value: "all", count: counts.all },
    { label: "Pending", value: "pending", count: counts.pending },
    { label: "Confirmed", value: "confirmed", count: counts.confirmed },
    { label: "Completed", value: "completed", count: counts.completed },
    { label: "Cancelled", value: "cancelled", count: counts.cancelled },
  ];

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">Supplier / Bookings</p>
          <h1 className="mt-1 text-3xl font-semibold text-gray-900">
            Quản lý booking
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Xem nhanh danh sách booking, lọc trạng thái và cập nhật booking ở
            panel bên cạnh.
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
                    ? "rounded-2xl bg-gray-950 px-4 py-2 text-sm font-black text-white"
                    : "rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-600 hover:bg-gray-50"
                }
              >
                {filter.label}{" "}
                <span className={active ? "text-white/70" : "text-gray-400"}>
                  {filter.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900">
                Danh sách booking
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Hiển thị {filteredBookings.length} booking
              </p>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm font-semibold text-gray-500">
              Không có booking nào ở trạng thái này.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <div className="hidden grid-cols-[1.1fr_120px_1fr_80px_120px_90px] gap-3 bg-gray-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-500 lg:grid">
                <span>Mã booking</span>
                <span>Status</span>
                <span>Nhà hàng</span>
                <span>Số khách</span>
                <span>Ngày giờ</span>
                <span className="text-right">Chi tiết</span>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => {
                  const restaurant = getRestaurant(booking);
                  const active = selectedBooking?.id === booking.id;

                  return (
                    <div
                      key={booking.id}
                      className={
                        active
                          ? "bg-amber-50/70 px-4 py-4"
                          : "bg-white px-4 py-4 hover:bg-gray-50"
                      }
                    >
                      <div className="grid gap-3 lg:grid-cols-[1.1fr_120px_1fr_80px_120px_90px] lg:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-gray-950">
                            {booking.booking_code}
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-gray-500 lg:hidden">
                            {restaurant?.name || "-"}
                          </p>
                        </div>

                        <div>
                          <StatusBadge status={booking.status as BookingStatus} />
                        </div>

                        <p className="hidden truncate text-sm font-semibold text-gray-700 lg:block">
                          {restaurant?.name || "-"}
                        </p>

                        <p className="text-sm font-bold text-gray-700">
                          <span className="lg:hidden">Số khách: </span>
                          {booking.guest_count ?? 0}
                        </p>

                        <p className="text-sm font-bold text-gray-700">
                          {booking.booking_date || "-"}
                          <span className="text-gray-400"> · </span>
                          {booking.booking_time || "-"}
                        </p>

                        <Link
                          href={getDetailHref(activeStatus, booking.id)}
                          className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-4 py-2 text-xs font-black text-white hover:bg-gray-800 lg:justify-self-end"
                        >
                          Chi tiết
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="xl:sticky xl:top-28 xl:h-fit">
          {selectedBooking ? (
            <BookingDetailPanel booking={selectedBooking} />
          ) : (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-500 shadow-sm">
              Chọn một booking để xem chi tiết.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function BookingDetailPanel({ booking }: { booking: any }) {
  const restaurant = getRestaurant(booking);
  const logs = getLogs(booking);

  return (
    <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black text-gray-900">
          {booking.booking_code}
        </h2>

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
        <Info label="Ngày" value={booking.booking_date || "-"} />
        <Info label="Giờ" value={booking.booking_time || "-"} />
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

      <div className="rounded-2xl border border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-black text-gray-900">
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
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-gray-900">{value}</p>
    </div>
  );
}

function MoneyInfo({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">
        {formatMoney(value)}
      </p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-gray-900">{value}</p>
    </div>
  );
}