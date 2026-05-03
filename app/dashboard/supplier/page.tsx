import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
      className="group rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-xl">
          {icon}
        </div>

        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
          View →
        </span>
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
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
      className="group rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-xl">
          {icon}
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-200 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-50">
        Đi đến quản lý
        <span className="transition group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

export default async function SupplierDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, company_name, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!supplier) redirect('/dashboard');

  const [restaurantsResult, activeRestaurantsResult, bookingsResult, completedBookingsResult] =
    await Promise.all([
      supabase
        .from('restaurants')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', supplier.id),

      supabase
        .from('restaurants')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', supplier.id)
        .eq('is_active', true),

      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', supplier.id),

      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', supplier.id)
        .eq('status', 'completed'),
    ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-4 py-5 md:px-6">
      <div className="relative mx-auto max-w-7xl space-y-5">
        {/* HEADER */}
        <section className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Supplier Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">
              {supplier.company_name || 'Supplier'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý restaurant, booking và trạng thái hoạt động của Supplier.
            </p>
          </div>

          <span className="w-fit rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-bold text-amber-700">
            Status: {supplier.status || 'active'}
          </span>
        </section>

        {/* STATS */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Restaurant"
            value={restaurantsResult.count || 0}
            description="Tổng số Restaurant của bạn."
            href="/dashboard/supplier/restaurants"
            icon="🏪"
          />

          <StatCard
            label="Active"
            value={activeRestaurantsResult.count || 0}
            description="Restaurant đang được active."
            href="/dashboard/supplier/restaurants"
            icon="✅"
          />

          <StatCard
            label="Booking"
            value={bookingsResult.count || 0}
            description="Booking thuộc Supplier của bạn."
            href="/dashboard/supplier/bookings"
            icon="📅"
          />

          <StatCard
            label="Completed"
            value={completedBookingsResult.count || 0}
            description="Booking đã hoàn thành."
            href="/dashboard/supplier/bookings"
            icon="🏁"
          />
        </section>

        {/* ACTIONS */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Khu vực quản lý</h2>
            <p className="mt-1 text-sm text-slate-500">
              Các module chính dành cho Supplier.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ActionCard
              title="My Profile"
              description="Cập nhật thông tin Supplier, hồ sơ doanh nghiệp và thông tin liên hệ."
              href="/dashboard/supplier/profile"
              icon="🏢"
            />

            <ActionCard
              title="My Restaurants"
              description="Tạo và quản lý Restaurant. Restaurant mới mặc định Inactive chờ Admin duyệt."
              href="/dashboard/supplier/restaurants"
              icon="🏪"
            />

            <ActionCard
              title="Bookings"
              description="Xem booking, cập nhật trạng thái pending, confirmed, completed hoặc cancelled."
              href="/dashboard/supplier/bookings"
              icon="📅"
            />
          </div>
        </section>
      </div>
    </main>
  );
}