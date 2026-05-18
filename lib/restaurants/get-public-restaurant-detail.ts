import { createClient } from "@/lib/supabase/server";
import { getCache, setCache } from "@/lib/cache/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/cache/keys";

export async function getPublicRestaurantDetail(slug: string) {
  const supabase = await createClient();
  const cacheKey = `${cacheKeys.publicRestaurantDetail(slug)}:i18n-v1`;

  const cached = await getCache<Record<string, unknown>>(cacheKey);

  if (cached?.is_active) {
    return cached;
  }

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !restaurant) return null;

  if (restaurant.is_active) {
    await setCache(cacheKey, restaurant, CACHE_TTL.PUBLIC_RESTAURANT_DETAIL);
    return restaurant;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (supplier && supplier.id === restaurant.supplier_id) {
    return restaurant;
  }

  const role = user.user_metadata?.role;

  if (role === "admin") {
    return restaurant;
  }

  return null;
}
