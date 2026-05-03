import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RestaurantManager from "@/app/dashboard/supplier/restaurants/restaurant-manager";

export const dynamic = "force-dynamic";

type RestaurantRow = {
  id: string;
  supplier_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  cover_image: string | null;
  gallery_images: string[] | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  opening_hours: Record<string, string> | null;
  price_range: string | null;
  discount_percent: number | null;
  tags: string[] | null;
  amenities: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type SearchParams = Promise<{
  edit?: string;
}>;

export default async function SupplierRestaurantsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const editId = params.edit ?? "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .single();

  if (supplierError || !supplier) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Không tìm thấy supplier gắn với tài khoản hiện tại.
        </div>
      </div>
    );
  }

  const { data: restaurants, error: restaurantsError } = await supabase
    .from("restaurants")
    .select(
      `
      id,
      supplier_id,
      name,
      slug,
      short_description,
      full_description,
      cover_image,
      gallery_images,
      address,
      city,
      latitude,
      longitude,
      phone,
      whatsapp,
      opening_hours,
      price_range,
      discount_percent,
      tags,
      amenities,
      is_active,
      is_featured,
      created_at,
      updated_at
    `,
    )
    .eq("supplier_id", supplier.id)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (restaurantsError) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Không tải được danh sách nhà hàng: {restaurantsError.message}
        </div>
      </div>
    );
  }

  const restaurantList = (restaurants ?? []) as RestaurantRow[];
  const editingRestaurant =
    restaurantList.find((item) => item.id === editId) ?? null;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Quản lý nhà hàng
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Supplier có thể tạo nhiều nhà hàng, chỉnh nội dung và bật/tắt hiển thị.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="font-medium text-slate-900">Supplier</div>
          <div className="text-slate-600">
            {supplier.company_name || "Unnamed Supplier"}
          </div>
        </div>
      </div>

      <RestaurantManager
        restaurants={restaurantList}
        editingRestaurant={editingRestaurant}
      />
    </div>
  );
}