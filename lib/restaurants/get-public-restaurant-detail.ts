import { createClient } from "@/lib/supabase/server";

export async function getPublicRestaurantDetail(slug: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Lấy restaurant trước (KHÔNG filter is_active)
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !restaurant) return null;

  // Nếu active → cho xem luôn
  if (restaurant.is_active) return restaurant;

  // Nếu chưa login → không cho xem
  if (!user) return null;

  // Check supplier ownership
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  // Nếu là owner → cho xem
  if (supplier && supplier.id === restaurant.supplier_id) {
    return restaurant;
  }

  // Check admin (role trong user metadata)
  const role = user.user_metadata?.role;

  if (role === "admin") {
    return restaurant;
  }

  return null;
}