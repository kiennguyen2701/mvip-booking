import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getCache, setCache } from "@/lib/cache/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/cache/keys";
import SupplierReportButton from "@/components/dashboard/supplier-report-button";

type SupplierDashboardStats = {
  restaurantsCount: number;
  activeRestaurantsCount: number;
  totalBookings: number;
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  cancelledCount: number;
  completedRevenue: number;
};

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

// FIX #4: Thay 8 queries Promise.all() bằng 1 RPC call duy nhất.
// Tạo function get_supplier_stats(uuid) trên Supabase trước (xem file SQL kèm theo).
async function getSupplierDashboardStats(
  supplierId: string,
): Promise<SupplierDashboardStats> {
  const cacheKey = cacheKeys.supplierDashboard(supplierId);
  const cached = await getCache<SupplierDashboardStats>(cacheKey);
  if (cached) return cached;

  const { data, error } = await adminClient.rpc("get_supplier_stats", {
    p_supplier_id: supplierId,
  });

  // Fallback về 8 queries nếu RPC chưa được tạo
  if (error) {
    console.warn("get_supplier_stats RPC not found, falling back:", error.message);

    const [
      restaurantsCountResult,
      activeRestaurantsCountResult,
      totalBookingsResult,
      pendingCountResult,
      confirmedCountResult,
      completedCountResult,
      cancelledCountResult,
      completedBillsResult,
    ] = await Promise.all([
      adminClient
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId),
      adminClient
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId)
        .eq("is_active", true),
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId),
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId)
        .or("status.eq.pending,status.is.null"),
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId)
        .eq("status", "confirmed"),
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId)
        .eq("status", "completed"),
      adminClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId)
        .in("status", ["cancelled", "canceled"]),
      adminClient
        .from("bookings")
        .select("total_bill")
        .eq("supplier_id", supplierId)
        .eq("status", "completed"),
    ]);

    const completedRevenue = (
      (completedBillsResult.data || []) as { total_bill: number | null }[]
    ).reduce((sum, b) => sum + Number(b.total_bill || 0), 0);

    const stats: SupplierDashboardStats = {
      restaurantsCount: restaurantsCountResult.count || 0,
      activeRestaurantsCount: activeRestaurantsCountResult.count || 0,
      totalBookings: totalBookingsResult.count || 0,
      pendingCount: pendingCountResult.count || 0,
      confirmedCount: confirmedCountResult.count || 0,
      completedCount: completedCountResult.count || 0,
      cancelledCount: cancelledCountResult.count || 0,
      completedRevenue,
    };

    await setCache(cacheKey, stats, CACHE_TTL.SUPPLIER_DASHBOARD);
    return stats;
  }

  // Parse kết quả từ RPC
  const rpc = data as {
    restaurants_count: number;
    active_restaurants_count: number;
    total_bookings: number;
    pending_count: number;
    confirmed_count: number;
    completed_count: number;
    cancelled_count: number;
    completed_revenue: number;
  };

  const stats: SupplierDashboardStats = {
    restaurantsCount: Number(rpc.restaurants_count || 0),
    activeRestaurantsCount: Number(rpc.active_restaurants_count || 0),
    totalBookings: Number(rpc.total_bookings || 0),
    pendingCount: Number(rpc.pending_count || 0),
    confirmedCount: Number(rpc.confirmed_count || 0),
    completedCount: Number(rpc.completed_count || 0),
    cancelledCount: Number(rpc.cancelled_count || 0),
    completedRevenue: Number(rpc.completed_revenue || 0),
  };

  await setCache(cacheKey, stats, CACHE_TTL.SUPPLIER_DASHBOARD);
  return stats;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupplierDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?_loop_guard=1");

  const { data: supplier } = await adminClient
    .from("suppliers")
    .select("id, company_name, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!supplier) redirect("/dashboard");

  const stats = await getSupplierDashboardStats(supplier.id);

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
                prefetch
                className="inline-flex items-center justify-center rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
              >
                Booking List →
              </Link>

              <Link
                href="/dashboard/supplier/restaurants"
                prefetch
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                My Restaurants →
              </Link>

              <SupplierReportButton />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Restaurants"
              value={stats.restaurantsCount}
              sub={`${stats.activeRestaurantsCount} active`}
            />

            <StatCard
              label="Pending / Confirmed"
              value={stats.pendingCount + stats.confirmedCount}
              sub={`${stats.pendingCount} pending · ${stats.confirmedCount} confirmed`}
            />

            <StatCard
              label="Completed"
              value={stats.completedCount}
              sub={formatMoney(stats.completedRevenue)}
            />

            <StatCard
              label="Total Bookings"
              value={stats.totalBookings}
              sub={`${stats.cancelledCount} cancelled`}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
