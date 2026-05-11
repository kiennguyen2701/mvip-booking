import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/status-badge";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

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
  customer_phone: string | null;
  phone: string | null;
  booking_date: string | null;
  booking_time: string | null;
  guest_count: number | null;
  guests: number | null;
  status: BookingStatus | string | null;
  total_bill: number | null;
  restaurants: RestaurantInfo | null;
};

function normalizeStatus(status?: string | null): BookingStatus {
  if (status === "confirmed") return "confirmed";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  return "pending";
}

function getCustomerName(booking: ActionBooking) {
  return booking.customer_full_name || booking.customer_name || "Customer";
}

function getCustomerPhone(booking: ActionBooking) {
  return booking.customer_phone || booking.phone || "-";
}

function getGuestCount(booking: ActionBooking) {
  return booking.guest_count ?? booking.guests ?? 1;
}

function formatMoney(value?: number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function buildReportCsv(bookings: ActionBooking[]) {
  const rows = [
    [
      "Booking Code",
      "Status",
      "Customer",
      "Phone",
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
      booking.restaurants?.name || "-",
      booking.restaurants?.city || "-",
      booking.booking_date || "-",
      booking.booking_time || "-",
      getGuestCount(booking),
      Number(booking.total_bill || 0),
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function ModuleCard({
  title,
  description,
  href,
  icon,
  stats,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  stats: { label: string; value: number }[];
}) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-white/80 bg-white/95 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-2xl">
          {icon}
        </div>

        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
          Manage →
        </span>
      </div>

      <h3 className="mt-5 text-2xl font-black text-slate-950">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </Link>
  );
}

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
    bookingsResult,
    pendingBookingsResult,
    confirmedBookingsResult,
    completedBookingsResult,
    actionBookingsResult,
    reportBookingsResult,
  ] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id),

    supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("is_active", true),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("status", "pending"),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("status", "confirmed"),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("status", "completed"),

    supabase
      .from("bookings")
      .select(
        `
        id,
        booking_code,
        customer_full_name,
        customer_name,
        customer_phone,
        phone,
        booking_date,
        booking_time,
        guest_count,
        guests,
        status,
        total_bill,
        restaurants(id,name,city,address)
      `,
      )
      .eq("supplier_id", supplier.id)
      .in("status", ["pending", "confirmed"])
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true })
      .limit(8),

    supabase
      .from("bookings")
      .select(
        `
        id,
        booking_code,
        customer_full_name,
        customer_name,
        customer_phone,
        phone,
        booking_date,
        booking_time,
        guest_count,
        guests,
        status,
        total_bill,
        restaurants(id,name,city,address)
      `,
      )
      .eq("supplier_id", supplier.id)
      .order("created_at", { ascending: false }),
  ]);

  const restaurantsCount = restaurantsResult.count || 0;
  const activeRestaurantsCount = activeRestaurantsResult.count || 0;
  const bookingsCount = bookingsResult.count || 0;
  const pendingCount = pendingBookingsResult.count || 0;
  const confirmedCount = confirmedBookingsResult.count || 0;
  const completedCount = completedBookingsResult.count || 0;

  const actionBookings = (actionBookingsResult.data || []) as ActionBooking[];
  const reportBookings = (reportBookingsResult.data || []) as ActionBooking[];

  const csv = buildReportCsv(reportBookings);
  const csvHref = `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(csv)}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-4 py-5 md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(214,155,56,0.11)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Supplier Dashboard
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              {supplier.company_name || "Supplier"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Quản lý nhà hàng và booking cần xử lý.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={csvHref}
              download={`supplier-booking-report-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              Download Report
            </a>

            <span className="w-fit rounded-full border border-amber-200 bg-white/80 px-4 py-3 text-sm font-bold text-amber-700">
              Status: {supplier.status || "active"}
            </span>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ModuleCard
            title="My Restaurants"
            description="Tạo, sửa và quản lý restaurant. Restaurant mới hoặc thay đổi sẽ chờ Admin duyệt."
            href="/dashboard/supplier/restaurants"
            icon="🏪"
            stats={[
              { label: "Total", value: restaurantsCount },
              { label: "Active", value: activeRestaurantsCount },
            ]}
          />

          <ModuleCard
            title="Booking List"
            description="Xem booking và cập nhật trạng thái pending, confirmed, completed hoặc cancelled."
            href="/dashboard/supplier/bookings"
            icon="📅"
            stats={[
              { label: "Pending/Confirm", value: pendingCount + confirmedCount },
              { label: "Completed", value: completedCount },
            ]}
          />
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-sm backdrop-blur">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Booking cần thao tác
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Chỉ hiển thị booking ở trạng thái Pending hoặc Confirmed.
              </p>
            </div>

            <Link
              href="/dashboard/supplier/bookings"
              className="w-fit rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Xem tất cả booking →
            </Link>
          </div>

          {actionBookings.length === 0 ? (
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
                  {actionBookings.map((booking) => {
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
                          <Link
                            href={`/dashboard/supplier/bookings?status=${status}&booking=${booking.id}`}
                            className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
                          >
                            Xử lý
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