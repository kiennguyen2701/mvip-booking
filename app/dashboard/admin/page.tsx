import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';

type StatCardProps = {
  label: string;
  value: number;
  description: string;
  href: string;
  icon: string;
};

function StatCard({ label, value, description, href, icon }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-xl">
          {icon}
        </div>

        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 transition group-hover:bg-amber-50 group-hover:text-amber-700">
          View →
        </span>
      </div>

      <p className="mt-6 text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-4xl font-black text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
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
      className="group rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-xl">
          {icon}
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-amber-200 px-4 py-2 text-sm font-black text-amber-700 transition hover:bg-amber-50">
        Đi đến quản lý
        <span className="transition group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [bookingsResult, agentsResult, suppliersResult] = await Promise.all([
    adminClient.from('bookings').select('id', { count: 'exact', head: true }),
    adminClient.from('agents').select('id', { count: 'exact', head: true }),
    adminClient.from('suppliers').select('id', { count: 'exact', head: true }),
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-4 py-6 md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(214,155,56,0.11)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-7">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Tổng quan hệ thống
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Quản lý booking, agent/CTV và supplier trong hệ thống Mvip Booking.
            </p>
          </div>

          <span className="w-fit rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-bold text-amber-700">
            Platform Admin
          </span>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Booking"
            value={bookingsResult.count || 0}
            description="Tổng booking đã được tạo trong hệ thống."
            href="/dashboard/admin/bookings"
            icon="📅"
          />

          <StatCard
            label="Agent"
            value={agentsResult.count || 0}
            description="CTV / đại lý đang tham gia hệ thống."
            href="/dashboard/admin/agents"
            icon="👥"
          />

          <StatCard
            label="Supplier"
            value={suppliersResult.count || 0}
            description="Nhà cung cấp, nhà hàng và đối tác hợp tác."
            href="/dashboard/admin/suppliers"
            icon="🏢"
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Khu vực quản lý</h2>
            <p className="mt-1 text-sm text-slate-500">
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