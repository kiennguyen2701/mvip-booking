import { createClient } from "@/lib/supabase/server";
import { getCache, setCache } from "@/lib/cache/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/cache/keys";

export async function getPublicRestaurantDetail(slug: string) {
  const supabase = await createClient();
  const normalizedSlug = String(slug || "").trim();

  if (!normalizedSlug) return null;

  const cacheKey = `${cacheKeys.publicRestaurantDetail(normalizedSlug)}:v7`;

  const cached = await getCache<Record<string, unknown>>(cacheKey);

  if (cached?.is_active) {
    return cached;
  }

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", normalizedSlug)
    .maybeSingle();

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