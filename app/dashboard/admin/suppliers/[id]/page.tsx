import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getSupplierDisplayName(supplier: Record<string, any>) {
  return (
    supplier.company_name ||
    supplier.name ||
    supplier.contact_name ||
    supplier.email ||
    "Supplier"
  );
}

function revalidatePaths(supplierId: string) {
  revalidatePath("/");
  revalidatePath("/restaurants");
  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath(`/dashboard/admin/suppliers/${supplierId}`);
  revalidatePath("/dashboard/supplier");
  revalidatePath("/dashboard/supplier/restaurants");
}

async function updateSupplierAction(formData: FormData) {
  "use server";

  const supplierId = String(formData.get("supplier_id") || "").trim();
  const companyName = String(formData.get("company_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const status = String(formData.get("status") || "active").trim();

  if (!supplierId || !companyName || !email) {
    throw new Error("Missing supplier information");
  }

  const normalizedStatus = status === "active" ? "active" : "inactive";

  const { error } = await adminClient
    .from("suppliers")
    .update({
      company_name: companyName,
      name: companyName,
      contact_name: companyName,
      email,
      login_email: email,
      phone,
      status: normalizedStatus,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", supplierId);

  if (error) throw new Error(error.message);

  if (normalizedStatus !== "active") {
    const { error: restaurantError } = await adminClient
      .from("restaurants")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("supplier_id", supplierId);

    if (restaurantError) throw new Error(restaurantError.message);
  }

  revalidatePaths(supplierId);
  redirect(`/dashboard/admin/suppliers/${supplierId}`);
}

async function updateRestaurantStatusAction(formData: FormData) {
  "use server";

  const supplierId = String(formData.get("supplier_id") || "").trim();
  const restaurantId = String(formData.get("restaurant_id") || "").trim();
  const isActive = String(formData.get("is_active") || "false") === "true";

  if (!supplierId || !restaurantId) {
    throw new Error("Missing restaurant information");
  }

  const { data: supplier, error: supplierError } = await adminClient
    .from("suppliers")
    .select("id, status")
    .eq("id", supplierId)
    .single();

  if (supplierError) throw new Error(supplierError.message);

  if (isActive && supplier.status !== "active") {
    throw new Error("Không thể active restaurant khi Supplier đang inactive.");
  }

  const { error } = await adminClient
    .from("restaurants")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", restaurantId)
    .eq("supplier_id", supplierId);

  if (error) throw new Error(error.message);

  revalidatePaths(supplierId);
  redirect(`/dashboard/admin/suppliers/${supplierId}`);
}

export default async function AdminSupplierDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: supplier } = await adminClient
    .from("suppliers")
    .select("*")
    .or(`id.eq.${id},user_id.eq.${id}`)
    .maybeSingle();

  if (!supplier) notFound();

  const { data: restaurants } = await adminClient
    .from("restaurants")
    .select("*")
    .eq("supplier_id", supplier.id)
    .order("created_at", { ascending: false });

  const supplierStatus = supplier.status === "active" ? "active" : "inactive";
  const supplierIsActive = supplierStatus === "active";

  return (
    <main className="relative min-h-screen bg-[#fbf7ef] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link
            href="/dashboard/admin/suppliers"
            className="text-sm font-bold text-slate-500 hover:text-slate-900"
          >
            ← Quay lại Suppliers
          </Link>

          <h1 className="mt-4 text-3xl font-black text-slate-950">
            {getSupplierDisplayName(supplier)}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Admin sửa thông tin Supplier và duyệt Restaurant thuộc Supplier này.
            Supplier inactive thì Customer sẽ không thấy restaurant.
          </p>
        </div>

        <section className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Sửa thông tin Supplier
          </h2>

          <form action={updateSupplierAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="supplier_id" value={supplier.id} />

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Tên Supplier
              </label>
              <input
                name="company_name"
                defaultValue={getSupplierDisplayName(supplier)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Email
              </label>
              <input
                name="email"
                type="email"
                defaultValue={supplier.login_email || supplier.email || ""}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Số điện thoại
              </label>
              <input
                name="phone"
                defaultValue={supplier.phone || ""}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Trạng thái
              </label>
              <select
                name="status"
                defaultValue={supplierStatus}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-3 md:col-span-2">
              <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                Lưu thay đổi
              </button>

              <Link
                href="/dashboard/admin/suppliers"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </Link>
            </div>
          </form>
        </section>

        {!supplierIsActive && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
            Supplier này đang inactive. Toàn bộ restaurant bên dưới sẽ không
            hiển thị cho Customer. Muốn duyệt restaurant lại, hãy active Supplier
            trước.
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-black text-slate-950">
              Restaurants của Supplier
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Admin duyệt Active / Inactive restaurant tại đây.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Restaurant</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(restaurants || []).map((restaurant) => (
                  <tr key={restaurant.id}>
                    <td className="px-5 py-4 font-black text-slate-950">
                      {restaurant.name}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {restaurant.address || "-"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {restaurant.phone || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {restaurant.is_active && supplierIsActive ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                          Pending / Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {restaurant.slug && (
                          <Link
                            href={`/restaurants/${restaurant.slug}`}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                          >
                            View Detail
                          </Link>
                        )}

                        <form action={updateRestaurantStatusAction}>
                          <input
                            type="hidden"
                            name="supplier_id"
                            value={supplier.id}
                          />
                          <input
                            type="hidden"
                            name="restaurant_id"
                            value={restaurant.id}
                          />
                          <input
                            type="hidden"
                            name="is_active"
                            value={restaurant.is_active ? "false" : "true"}
                          />

                          <button
                            disabled={!supplierIsActive && !restaurant.is_active}
                            className={
                              !supplierIsActive && !restaurant.is_active
                                ? "cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-black text-slate-400"
                                : restaurant.is_active
                                  ? "rounded-xl border border-red-200 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                                  : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                            }
                          >
                            {restaurant.is_active ? "Deactivate" : "Approve"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}

                {!(restaurants || []).length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      Supplier này chưa có restaurant nào.
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