import { redirect } from "next/navigation";
import RestaurantManager from "@/app/dashboard/supplier/restaurants/restaurant-manager";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  searchParams: Promise<{
    edit?: string;
  }>;
};

export default async function SupplierRestaurantsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { edit } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "supplier") {
    redirect("/dashboard");
  }

  const { data: supplier } = await adminClient
    .from("suppliers")
    .select("id, business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!supplier) {
    redirect("/dashboard/supplier");
  }

  const { data: restaurants } = await adminClient
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
      menu_images,
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
    .order("created_at", { ascending: false });

  const editingRestaurant =
    restaurants?.find((restaurant) => restaurant.id === edit) || null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">
            Supplier Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Restaurants
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Quản lý nhà hàng, hình ảnh, menu, vị trí, giờ mở cửa và nội dung
            hiển thị trên trang detail.
          </p>
        </div>

        <RestaurantManager
          restaurants={restaurants || []}
          editingRestaurant={editingRestaurant}
        />
      </section>
    </main>
  );
}