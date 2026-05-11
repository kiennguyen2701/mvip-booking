import Link from "next/link";
import { redirect } from "next/navigation";
import RestaurantManager from "./restaurant-manager";
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

  const restaurantRows = restaurants || [];

  const editingRestaurant =
    restaurantRows.find((restaurant) => restaurant.id === edit) || null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050403] px-4 py-5 text-white md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[520px] w-[520px] rounded-full bg-orange-700/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(251,191,36,0.12)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <section className="relative mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#11100c]/95 p-5 shadow-2xl shadow-black/40 backdrop-blur md:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
                Supplier Dashboard
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                Restaurants
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Quản lý nhà hàng, hình ảnh, menu, vị trí, giờ mở cửa và nội dung
                hiển thị trên trang detail.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/supplier"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Tổng quan
              </Link>

              <Link
                href="/dashboard/supplier/bookings"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
              >
                Booking List →
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#11100c]/95 p-5 shadow-2xl shadow-black/35 backdrop-blur md:p-6">
          <RestaurantManager
            restaurants={restaurantRows}
            editingRestaurant={editingRestaurant}
          />
        </div>
      </section>
    </main>
  );
}