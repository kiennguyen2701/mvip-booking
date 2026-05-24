import { createClient } from "@/lib/supabase/server";
import { getCache, setCache } from "@/lib/cache/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/cache/keys";

const DETAIL_SELECT = `
  id,
  slug,
  name,
  name_zh,
  supplier_id,
  is_active,
  cover_image,
  gallery_images,
  menu_images,
  short_description,
  short_description_zh,
  full_description,
  full_description_zh,
  address,
  address_zh,
  city,
  city_zh,
  latitude,
  longitude,
  tags,
  tags_zh,
  amenities,
  amenities_zh,
  opening_hours,
  opening_hours_zh,
  price_range,
  price_range_zh,
  created_at,
  updated_at
`;

export async function getPublicRestaurantDetail(slug: string) {
  const supabase = await createClient();
  const normalizedSlug = String(slug || "").trim();

  if (!normalizedSlug) return null;

  const cacheKey = `${cacheKeys.publicRestaurantDetail(normalizedSlug)}:v8`;

  const cached = await getCache<Record<string, unknown>>(cacheKey);

  if (cached?.is_active) {
    return cached;
  }

  let { data: restaurant, error } = await supabase
    .from("restaurants")
    .select(DETAIL_SELECT)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    console.error("GET_RESTAURANT_DETAIL_OPTIMIZED_SELECT_ERROR:", error);

    const fallback = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    restaurant = fallback.data;
    error = fallback.error;
  }

  if (error || !restaurant) return null;

  if (restaurant.is_active) {
    await setCache(cacheKey, restaurant, CACHE_TTL.PUBLIC_RESTAURANT_DETAIL);
    return restaurant;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = user.user_metadata?.role;

  if (role === "admin") {
    return restaurant;
  }

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (supplier?.id === restaurant.supplier_id) {
    return restaurant;
  }

  return null;
}