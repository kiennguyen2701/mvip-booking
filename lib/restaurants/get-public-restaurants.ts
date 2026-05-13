import { createClient } from "@/lib/supabase/server";
import { getCache, setCache } from "@/lib/cache/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/cache/keys";

export type PublicRestaurant = {
  id: string;
  name: string | null;
  slug: string | null;
  address: string | null;
  city: string | null;
  cover_image: string | null;
  image_url?: string | null;
  discount_percent?: number | null;
  cuisine_type?: string | null;
  cuisine?: string | null;
  category?: string | null;
  price_range?: string | null;
  tags?: string[] | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type GetPublicRestaurantsParams = {
  query?: string;
  city?: string;
  tag?: string;
  priceRange?: string;
  limit?: number;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function includesNormalized(source: string | null | undefined, keyword: string) {
  if (!keyword) return true;
  return normalizeText(source || "").includes(keyword);
}

export async function getPublicRestaurants({
  query = "",
  city = "",
  tag = "",
  priceRange = "",
  limit = 60,
}: GetPublicRestaurantsParams = {}) {
  const cacheKey = cacheKeys.publicRestaurants({
    query,
    city,
    tag,
    priceRange,
    limit,
  });

  const cached = await getCache<PublicRestaurant[]>(cacheKey);
  if (cached) return cached;

  const supabase = await createClient();

  const hasClientSideFilter = Boolean(query || city || tag);
  const safeLimit = hasClientSideFilter
    ? Math.min(Math.max(limit * 4, 120), 300)
    : Math.min(Math.max(limit, 1), 120);

  let request = supabase
    .from("restaurants")
    .select(
      `
      id,
      name,
      slug,
      address,
      city,
      cover_image,
      image_url,
      discount_percent,
      cuisine_type,
      cuisine,
      category,
      price_range,
      tags,
      is_active,
      created_at
    `,
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (priceRange) {
    request = request.eq("price_range", priceRange);
  }

  const { data, error } = await request;

  if (error) {
    console.error("getPublicRestaurants error:", error);
    return [];
  }

  const normalizedQuery = normalizeText(query);
  const normalizedCity = normalizeText(city);
  const normalizedTag = normalizeText(tag);

  const restaurants = ((data || []) as PublicRestaurant[])
    .filter((restaurant) => {
      const tags = Array.isArray(restaurant.tags) ? restaurant.tags : [];

      const matchQuery =
        !normalizedQuery ||
        includesNormalized(restaurant.name, normalizedQuery) ||
        includesNormalized(restaurant.address, normalizedQuery) ||
        includesNormalized(restaurant.city, normalizedQuery) ||
        includesNormalized(restaurant.cuisine_type, normalizedQuery) ||
        includesNormalized(restaurant.cuisine, normalizedQuery) ||
        includesNormalized(restaurant.category, normalizedQuery) ||
        tags.some((item) => includesNormalized(item, normalizedQuery));

      const matchCity =
        !normalizedCity || includesNormalized(restaurant.city, normalizedCity);

      const matchTag =
        !normalizedTag ||
        tags.some((item) => includesNormalized(item, normalizedTag)) ||
        includesNormalized(restaurant.cuisine_type, normalizedTag) ||
        includesNormalized(restaurant.cuisine, normalizedTag) ||
        includesNormalized(restaurant.category, normalizedTag);

      return matchQuery && matchCity && matchTag;
    })
    .slice(0, limit);

  await setCache(cacheKey, restaurants, CACHE_TTL.PUBLIC_RESTAURANTS);

  return restaurants;
}