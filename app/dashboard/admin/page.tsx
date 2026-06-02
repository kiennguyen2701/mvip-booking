import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { getCache, setCache } from "@/lib/cache/cache";

type AdminDashboardStats = {
  bookingsCount: number;
  agentsCount: number;
  suppliersCount: number;
};

type StatCardProps = {
  label: string;
  value: number;
  description: string;
  href: string;
  icon: string;
};

const ADMIN_DASHBOARD_CACHE_KEY = "admin:dashboard:overview:v1";
const ADMIN_DASHBOARD_CACHE_TTL = 30;

function StatCard({ label, value, description, href, icon }: StatCardProps) {
  return (
    <Link
      href={href}
      prefetch
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#11100c]/95 p-6 shadow-xl shadow-black/40 transition hover:border-amber-300/30 hover:shadow-amber-950/30"
    >
      {/* inner glow on hover */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/0 blur-2xl transition group-hover:bg-amber-400/10" />

      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-xl">
          {icon}
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/35 transition group-hover:border-amber-300/20 group-hover:text-amber-300">
          View →
        </span>
      </div>

      <p className="mt-6 text-xs font-black uppercase tracking-widest text-white/35">{label}</p>
      <p className="mt-1 text-4xl font-black text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-white/40">{description}</p>
    </Link>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#11100c]/95 p-6 shadow-xl shadow-black/40 transition hover:border-amber-300/30 hover:shadow-amber-950/30"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/0 blur-2xl transition group-hover:bg-amber-400/8" />

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-xl">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-black text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/40">{description}</p>
        </div>
      </div>

      <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-amber-300/30 px-4 py-2 text-sm font-black text-amber-300 transition group-hover:bg-amber-300/10">
        Đi đến quản lý
        <span className="transition group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const cached = await getCache<AdminDashboardStats>(ADMIN_DASHBOARD_CACHE_KEY);

  if (cached) return cached;

  const [bookingsResult, agentsResult, suppliersResult] = await Promise.all([
    adminClient.from("bookings").select("id", { count: "exact", head: true }),
    adminClient.from("agents").select("id", { count: "exact", head: true }),
    adminClient.from("suppliers").select("id", { count: "exact", head: true }),
  ]);

  const stats: AdminDashboardStats = {
    bookingsCount: bookingsResult.count || 0,
    agentsCount: agentsResult.count || 0,
    suppliersCount: suppliersResult.count || 0,
  };

  await setCache(stats ? ADMIN_DASHBOARD_CACHE_KEY : "", stats, ADMIN_DASHBOARD_CACHE_TTL);

  return stats;
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const stats = await getAdminDashboardStats();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050403] px-4 py-6 text-white md:px-6">

      {/* Background layers — giống customer dashboard */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl md:h-[480px] md:w-[480px]" />
        <div className="absolute right-0 top-40 h-48 w-48 rounded-full bg-orange-900/20 blur-3xl md:h-96 md:w-96" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-amber-700/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(251,191,36,0.09)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-8">

        {/* Header card */}
        <section className="relative overflow-hidden rounded-[1.5rem] border border-amber-300/15 bg-[#11100c]/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)] md:p-8">
          <div className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-6 h-52 w-52 rounded-full bg-orange-700/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                Admin Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Tổng quan hệ thống
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                Quản lý booking, agent/CTV và supplier trong hệ thống Mvip Booking.
              </p>
            </div>

            <span className="w-fit rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-4 py-2 text-sm font-bold text-amber-300">
              Platform Admin
            </span>
          </div>
        </section>

        {/* Stat cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Booking"
            value={stats.bookingsCount}
            description="Tổng booking đã được tạo trong hệ thống."
            href="/dashboard/admin/bookings"
            icon="📅"
          />
          <StatCard
            label="Agent"
            value={stats.agentsCount}
            description="CTV / đại lý đang tham gia hệ thống."
            href="/dashboard/admin/agents"
            icon="👥"
          />
          <StatCard
            label="Supplier"
            value={stats.suppliersCount}
            description="Nhà cung cấp, nhà hàng và đối tác hợp tác."
            href="/dashboard/admin/suppliers"
            icon="🏢"
          />
        </section>

        {/* Action cards */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white">Khu vực quản lý</h2>
            <p className="mt-1 text-sm text-white/45">
              Các module vận hành chính dành cho Admin.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ActionCard
              title="Bookings"
              description="Xem toàn bộ booking, trạng thái, timeline, tổng bill và commission."
              href="/dashboard/admin/bookings"
              icon="📅"
            />
            <ActionCard
              title="Agents"
              description="Quản lý CTV/đại lý, mã referral, QR, hoa hồng và tài khoản đăng nhập."
              href="/dashboard/admin/agents"
              icon="👥"
            />
            <ActionCard
              title="Suppliers"
              description="Quản lý supplier, trạng thái hoạt động, tài khoản và thông tin đối tác."
              href="/dashboard/admin/suppliers"
              icon="🏢"
            />
          </div>
        </section>

      </div>
    </main>
  );
}
