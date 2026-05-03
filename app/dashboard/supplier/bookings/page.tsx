import { createClient } from "@/lib/supabase/server";
import { getCurrentSupplier } from "@/lib/suppliers/get-current-supplier";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SupplierBookingStatusForm } from "@/components/dashboard/supplier-booking-status-form";
import { BookingStatusTimeline } from "@/components/dashboard/booking-status-timeline";

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

type BookingLog = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by_role: string | null;
  note: string | null;
  created_at: string;
};

export default async function SupplierBookingsPage() {
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
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Supplier / Bookings</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-900">
          Quản lý booking
        </h1>
      </div>

      <div className="space-y-4">
        {(bookings ?? []).map((booking) => {
          const restaurant = booking.restaurants as
            | { name?: string; city?: string; address?: string }
            | null;

          const logs: BookingLog[] = (
            (booking.booking_status_logs as BookingLog[] | null) ?? []
          ).sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );

          return (
            <div
              key={booking.id}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="grid gap-5 xl:grid-cols-[1.5fr_460px]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {booking.booking_code}
                    </h2>
                    <StatusBadge
                      status={
                        booking.status as
                          | "pending"
                          | "confirmed"
                          | "cancelled"
                          | "completed"
                      }
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Info
                      label="Khách hàng"
                      value={booking.customer_full_name || "-"}
                    />
                    <Info label="Email" value={booking.customer_email || "-"} />
                    <Info label="Phone" value={booking.customer_phone || "-"} />
                    <Info
                      label="Whatsapp"
                      value={booking.customer_whatsapp || "-"}
                    />
                    <Info label="Nhà hàng" value={restaurant?.name || "-"} />
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
                    <Info
                      label="Số khách"
                      value={String(booking.guest_count ?? 0)}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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

                <div className="w-full">
                  <SupplierBookingStatusForm
                    booking={{
                      id: booking.id,
                      status: booking.status as
                        | "pending"
                        | "confirmed"
                        | "cancelled"
                        | "completed",
                      total_bill: Number(booking.total_bill ?? 0),
                      supplier_note: booking.supplier_note,
                      cancellation_reason: booking.cancellation_reason,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
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
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}