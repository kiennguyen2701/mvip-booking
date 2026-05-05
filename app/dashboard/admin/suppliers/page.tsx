import Link from 'next/link';
import { adminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import {
  createSupplierAction,
  deactivateSupplierAction,
} from './actions';

type SupplierRow = {
  id: string;
  company_name: string | null;
  name: string | null;
  email: string | null;
  login_email: string | null;
  phone: string | null;
  address: string | null;
  status: string | null;
  created_at: string | null;
  restaurants?: { id: string; is_active: boolean | null }[];
};

type RestaurantRow = {
  id: string;
  supplier_id: string | null;
  name: string | null;
  slug: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  status: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

function getSupplierName(supplier: SupplierRow) {
  return supplier.company_name || supplier.name || supplier.email || 'Supplier';
}

function isPendingRestaurant(restaurant: RestaurantRow) {
  return (
    restaurant.status === 'pending_review' ||
    restaurant.status === 'pending' ||
    (!restaurant.is_active &&
      restaurant.status !== 'approved' &&
      restaurant.status !== 'rejected')
  );
}

function getRestaurantStatusLabel(restaurant: RestaurantRow) {
  if (restaurant.is_active || restaurant.status === 'approved') return 'Active';
  if (restaurant.status === 'rejected') return 'Rejected';
  return 'Pending / Inactive';
}

function getRestaurantStatusClass(restaurant: RestaurantRow) {
  if (restaurant.is_active || restaurant.status === 'approved') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (restaurant.status === 'rejected') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export default async function AdminSuppliersPage() {
  await requireAdmin();

  const [{ data: suppliers, error }, { data: restaurants, error: restaurantsError }] =
    await Promise.all([
      adminClient
        .from('suppliers')
        .select(`
          id,
          company_name,
          name,
          email,
          login_email,
          phone,
          address,
          status,
          created_at,
          restaurants:restaurants(id, is_active)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),

      adminClient
        .from('restaurants')
        .select(`
          id,
          supplier_id,
          name,
          slug,
          city,
          district,
          address,
          phone,
          status,
          is_active,
          created_at
        `)
        .order('created_at', { ascending: false }),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  if (restaurantsError) {
    throw new Error(restaurantsError.message);
  }

  const supplierRows = (suppliers || []) as SupplierRow[];
  const restaurantRows = (restaurants || []) as RestaurantRow[];

  const pendingRequests = restaurantRows.filter(isPendingRestaurant).length;

  const supplierNameMap = new Map(
    supplierRows.map((supplier) => [supplier.id, getSupplierName(supplier)]),
  );

  return (
    <main className="min-h-screen bg-[#fbf7ef]">
      <div className="fixed left-0 right-0 top-0 z-[2147483647] border-b border-slate-200 bg-[#fbf7ef]/95 px-3 py-2 shadow-2xl shadow-black/15 backdrop-blur md:px-6 md:py-3">
        <section className="mx-auto grid max-w-7xl grid-cols-2 gap-2 rounded-[22px] border border-slate-200 bg-white/95 p-2 shadow-sm md:grid-cols-4 md:gap-3 md:rounded-[28px] md:p-3">
          <a
            href="#create-supplier"
            className="rounded-2xl bg-slate-950 px-3 py-3 text-center text-xs font-black text-white transition hover:bg-slate-800 md:px-5 md:py-4 md:text-sm"
          >
            Create Supplier
          </a>

          <a
            href="#list-restaurants"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-slate-800 transition hover:bg-slate-50 md:px-5 md:py-4 md:text-sm"
          >
            List Restaurants
          </a>

          <a
            href="#list-suppliers"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-slate-800 transition hover:bg-slate-50 md:px-5 md:py-4 md:text-sm"
          >
            List Suppliers
          </a>

          <Link
            href="/dashboard/admin/supplier-requests"
            className="relative rounded-2xl bg-amber-300 px-3 py-3 text-center text-xs font-black text-slate-950 transition hover:bg-amber-200 md:px-5 md:py-4 md:text-sm"
          >
            List Request
            {pendingRequests > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white">
                {pendingRequests}
              </span>
            )}
          </Link>
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-6 pt-[132px] md:px-6 md:pt-[126px]">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">
              Platform Admin
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Supplier Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Quản lý Supplier, Restaurant và các request đang chờ duyệt.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <section
          id="create-supplier"
          className="scroll-mt-[132px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:scroll-mt-[126px]"
        >
          <h2 className="text-lg font-black text-slate-950">
            Create Supplier
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tạo tài khoản Supplier mới để đăng nhập và quản lý restaurants.
          </p>

          <form action={createSupplierAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <input name="company_name" required placeholder="Tên Supplier" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />

            <input name="email" required type="email" placeholder="Email đăng nhập" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />

            <input name="password" required type="password" placeholder="Mật khẩu" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />

            <input name="phone" placeholder="Số điện thoại" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />

            <input name="address" placeholder="Địa chỉ Supplier" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100 md:col-span-2" />

            <div className="md:col-span-2">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                Thêm Supplier
              </button>
            </div>
          </form>
        </section>

        <section
          id="list-restaurants"
          className="scroll-mt-[132px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:scroll-mt-[126px]"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                List Restaurants
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Toàn bộ restaurants trong hệ thống, bao gồm active và pending.
              </p>
            </div>

            <Link href="/dashboard/admin/supplier-requests" className="w-fit rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200">
              View Requests
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Restaurant</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {restaurantRows.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-950">
                        {restaurant.name || 'Restaurant'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {restaurant.slug || '-'}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {restaurant.supplier_id
                        ? supplierNameMap.get(restaurant.supplier_id) || 'Supplier'
                        : '-'}
                    </td>

                    <td className="max-w-[260px] px-5 py-4 text-slate-600">
                      <p className="line-clamp-2">
                        {restaurant.address ||
                          restaurant.district ||
                          restaurant.city ||
                          '-'}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {restaurant.phone || '-'}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getRestaurantStatusClass(restaurant)}`}>
                        {getRestaurantStatusLabel(restaurant)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {restaurant.slug && (
                          <Link href={`/restaurants/${restaurant.slug}`} target="_blank" className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100">
                            View
                          </Link>
                        )}

                        {isPendingRestaurant(restaurant) && (
                          <Link href="/dashboard/admin/supplier-requests" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100">
                            Review
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!restaurantRows.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Chưa có restaurant nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          id="list-suppliers"
          className="scroll-mt-[132px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:scroll-mt-[126px]"
        >
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black text-slate-950">
              List Suppliers
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Danh sách này chỉ show Supplier có status active.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Email Login</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Restaurants</th>
                  <th className="px-5 py-3">Active Restaurants</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {supplierRows.map((supplier) => {
                  const totalRestaurants = supplier.restaurants?.length || 0;
                  const activeRestaurants =
                    supplier.restaurants?.filter((item) => item.is_active).length || 0;

                  return (
                    <tr key={supplier.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">
                          {getSupplierName(supplier)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-emerald-600">
                          active
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {supplier.login_email || supplier.email || '-'}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {supplier.phone || '-'}
                      </td>

                      <td className="max-w-[260px] px-5 py-4 text-slate-600">
                        <p className="line-clamp-2">{supplier.address || '-'}</p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {totalRestaurants}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {activeRestaurants}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/admin/suppliers/${supplier.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100">
                            View
                          </Link>

                          <form action={deactivateSupplierAction}>
                            <input type="hidden" name="id" value={supplier.id} />
                            <button className="rounded-xl border border-red-200 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-50">
                              Deactivate
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!supplierRows.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      Chưa có Supplier active nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}