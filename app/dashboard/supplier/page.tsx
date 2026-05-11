import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/dashboard/status-badge";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

type RestaurantInfo = {
  id?: string;
  name?: string | null;
  city?: string | null;
  address?: string | null;
};

type SupplierBooking = {
  id: string;
  booking_code?: string | null;
  customer_full_name?: string | null;
  customer_name?: string | null;
  name?: string | null;
  customer_phone?: string | null;
  phone?: string | null;
  customer_email?: string | null;
  email?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  guest_count?: number | null;
  guests?: number | null;
  status?: BookingStatus | string | null;
  total_bill?: number | null;
  service_name?: string | null;
  restaurants?: RestaurantInfo | null;
};

function normalizeStatus(status?: string | null): BookingStatus {
  if (status === "confirmed") return "confirmed";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  return "pending";
}

function getCustomerName(booking: SupplierBooking) {
  return (
    booking.customer_full_name ||
    booking.customer_name ||
    booking.name ||
    "Customer"
  );
}

function getCustomerPhone(booking: SupplierBooking) {
  return booking.customer_phone || booking.phone || "-";
}

function getCustomerEmail(booking: SupplierBooking) {
  return booking.customer_email || booking.email || "-";
}

function getGuestCount(booking: SupplierBooking) {
  return booking.guest_count ?? booking.guests ?? 1;
}

function formatMoney(value?: number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function buildReportCsv(bookings: SupplierBooking[]) {
  const rows = [
    [
      "Booking Code",
      "Status",
      "Customer",
      "Phone",
      "Email",
      "Restaurant",
      "City",
      "Date",
      "Time",
      "Guests",
      "Total Bill",
    ],
    ...bookings.map((booking) => [
      booking.booking_code || booking.id,
      normalizeStatus(booking.status),
      getCustomerName(booking),
      getCustomerPhone(booking),
      getCustomerEmail(booking),
      booking.restaurants?.name || booking.service_name || "-",
      booking.restaurants?.city || "-",
      booking.booking_date || "-",
      booking.booking_time || "-",
      getGuestCount(booking),
      Number(booking.total_bill || 0),
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      {sub ? (
        <p className="mt-2 text-xs font-semibold text-slate-400">{sub}</p>
      ) : null}
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupplierDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id, company_name, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!supplier) redirect("/dashboard");

  const [
    restaurantsResult,
    activeRestaurantsResult,
    pendingBookingsResult,
    confirmedBookingsResult,
    completedBookingsResult,
    cancelledBookingsResult,
    bookingsResult,
  ] = await Promise.all([
    adminClient
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id),

    adminClient
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("is_active", true),

    adminClient
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("status", "pending"),

    adminClient
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("status", "confirmed"),

    adminClient
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("status", "completed"),

    adminClient
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("status", "cancelled"),

    adminClient
      .from("bookings")
      .select(`
        *,
        restaurants(id,name,city,address)
      `)
      .eq("supplier_id", supplier.id)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const restaurantsCount = restaurantsResult.count || 0;
  const activeRestaurantsCount = activeRestaurantsResult.count || 0;
  const pendingCount = pendingBookingsResult.count || 0;
  const confirmedCount = confirmedBookingsResult.count || 0;
  const completedCount = completedBookingsResult.count || 0;
  const cancelledCount = cancelledBookingsResult.count || 0;

  const bookings = ((bookingsResult.data || []) as SupplierBooking[]).map(
    (booking) => ({
      ...booking,
      status: normalizeStatus(booking.status),
    }),
  );

  const totalBookings =
    pendingCount + confirmedCount + completedCount + cancelledCount;

  const completedRevenue = bookings
    .filter((booking) => normalizeStatus(booking.status) === "completed")
    .reduce((sum, booking) => sum + Number(booking.total_bill || 0), 0);

  const csv = buildReportCsv(bookings);
  const csvHref = `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(csv)}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070604] px-4 py-5 text-white md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[520px] w-[520px] rounded-full bg-orange-700/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(251,191,36,0.12)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#11100c]/95 p-5 shadow-2xl shadow-black/40 backdrop-blur md:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
                Supplier Dashboard
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                {supplier.company_name || "Supplier"}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Booking List hiển thị trực tiếp trên dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={csvHref}
                download={`supplier-booking-report-${new Date()
                  .toISOString()
                  .slice(0, 10)}.csv`}
                className="inline-flex items-center justify-center rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
              >
                Download Report
              </a>

              <Link
                href="/dashboard/supplier/bookings"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Manage Bookings →
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Restaurants"
              value={restaurantsCount}
              sub={`${activeRestaurantsCount} active`}
            />
            <StatCard
              label="Pending / Confirmed"
              value={pendingCount + confirmedCount}
              sub={`${pendingCount} pending · ${confirmedCount} confirmed`}
            />
            <StatCard
              label="Completed"
              value={completedCount}
              sub={formatMoney(completedRevenue)}
            />
            <StatCard
              label="Total Bookings"
              value={totalBookings}
              sub={`${cancelledCount} cancelled`}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#11100c]/95 shadow-2xl shadow-black/35 backdrop-blur">
          <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                Booking List
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Danh sách booking
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Hiển thị trực tiếp trên Supplier Dashboard.
              </p>
            </div>

            <Link
              href="/dashboard/supplier/bookings"
              prefetch={false}
              className="w-fit rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              Xem đầy đủ →
            </Link>
          </div>

          {bookingsResult.error ? (
            <div className="px-5 py-10 text-center text-sm font-semibold text-red-300">
              Lỗi tải Booking List: {bookingsResult.error.message}
            </div>
          ) : bookings.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm font-semibold text-slate-400">
              Hiện chưa có booking nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Booking</th>
                    <th className="px-5 py-4">Khách</th>
                    <th className="px-5 py-4">Nhà hàng</th>
                    <th className="px-5 py-4">Ngày giờ</th>
                    <th className="px-5 py-4">Số khách</th>
                    <th className="px-5 py-4">Bill</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {bookings.map((booking) => {
                    const status = normalizeStatus(booking.status);

                    return (
                      <tr
                        key={booking.id}
                        className="transition hover:bg-white/[0.04]"
                      >
                        <td className="px-5 py-4 font-black text-white">
                          {booking.booking_code || booking.id.slice(0, 8)}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-white">
                            {getCustomerName(booking)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {getCustomerPhone(booking)}
                          </p>
                          <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                            {getCustomerEmail(booking)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-white">
                            {booking.restaurants?.name ||
                              booking.service_name ||
                              "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {booking.restaurants?.city || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-white">
                            {booking.booking_date || "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {booking.booking_time || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-200">
                          {getGuestCount(booking)}
                        </td>

                        <td className="px-5 py-4 font-black text-amber-300">
                          {formatMoney(booking.total_bill)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={status} />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/supplier/bookings?booking=${booking.id}`}
                            prefetch={false}
                            className="rounded-xl bg-amber-300 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-200"
                          >
                            Chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}