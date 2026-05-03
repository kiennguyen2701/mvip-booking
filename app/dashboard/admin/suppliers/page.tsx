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

function getSupplierName(supplier: SupplierRow) {
  return supplier.company_name || supplier.name || supplier.email || 'Supplier';
}

export default async function AdminSuppliersPage() {
  await requireAdmin();

  const [{ data: suppliers, error }, { count: pendingRequests }] =
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
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review'),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  const supplierRows = (suppliers || []) as SupplierRow[];

  return (
    <main className="min-h-screen bg-[#fbf7ef] px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">
              Platform Admin
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Supplier Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Chỉ hiển thị Supplier đang active. Supplier inactive sẽ bị ẩn khỏi danh sách chính.
            </p>
          </div>

          <Link
            href="/dashboard/admin/supplier-requests"
            className="relative rounded-2xl border border-amber-200 bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-amber-200"
          >
            Supplier Requests
            {(pendingRequests || 0) > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white">
                {pendingRequests}
              </span>
            )}
          </Link>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">
            Thêm Supplier mới
          </h2>

          <form action={createSupplierAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <input
              name="company_name"
              required
              placeholder="Tên Supplier"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            />

            <input
              name="email"
              required
              type="email"
              placeholder="Email đăng nhập"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            />

            <input
              name="password"
              required
              type="password"
              placeholder="Mật khẩu"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            />

            <input
              name="phone"
              placeholder="Số điện thoại"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            />

            <input
              name="address"
              placeholder="Địa chỉ Supplier"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100 md:col-span-2"
            />

            <div className="md:col-span-2">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                Thêm Supplier
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black text-slate-950">
              Danh sách Supplier Active
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
                          <Link
                            href={`/dashboard/admin/suppliers/${supplier.id}`}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                          >
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
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
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