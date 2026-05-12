import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

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

function formatMoney(value?: number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

async function getCount(query: PromiseLike<{ count: number | null }>) {
  const result = await query;
  return result.count || 0;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupplierDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: supplier, error: supplierError } = await adminClient
    .from("suppliers")
    .select("id, company_name, status, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (supplierError || !supplier) {
    redirect("/dashboard");
  }

  if (supplier.is_active === false) {
    redirect("/dashboard");
  }

  const [
    restaurantsCount,
    activeRestaurantsCount,
    totalBookings,
    pendingCount,
    confirmedCount,
    completedCount,
    cancelledCount,
    completedBillsResult,
  ] = await Promise.all([
    getCount(
      adminClient
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplier.id),
    ),

    getCount(
      adminClient
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplier.id)
        .eq("is_active", true),
    ),

    getCount(
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplier.id),
    ),

    getCount(
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplier.id)
        .or("status.eq.pending,status.is.null"),
    ),

    getCount(
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplier.id)
        .eq("status", "confirmed"),
    ),

    getCount(
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplier.id)
        .eq("status", "completed"),
    ),

    getCount(
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplier.id)
        .in("status", ["cancelled", "canceled"]),
    ),

    adminClient
      .from("bookings")
      .select("total_bill")
      .eq("supplier_id", supplier.id)
      .eq("status", "completed"),
  ]);

  const completedRevenue = (completedBillsResult.data || []).reduce(
    (sum, booking) => sum + Number(booking.total_bill || 0),
    0,
  );

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
                Tổng quan nhanh về nhà hàng, booking và doanh thu completed.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/supplier/bookings"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
              >
                Booking List →
              </Link>

              <Link
                href="/dashboard/supplier/restaurants"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                My Restaurants →
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
      </div>
    </main>
  );
}