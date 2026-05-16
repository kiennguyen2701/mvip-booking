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
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  average_rating?: number | null;
  total_reviews?: number;
};

type GetPublicRestaurantsParams = {
  query?: string;
  city?: string;
  tag?: string;
  priceRange?: string;
  limit?: number;
};

type ReviewRatingRow = {
  restaurant_id: string | null;
  rating: number | null;
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

function buildRatingMap(rows: ReviewRatingRow[]) {
  const map = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    if (!row.restaurant_id) continue;

    const rating = Number(row.rating || 0);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;

    const current = map.get(row.restaurant_id) || {
      total: 0,
      count: 0,
    };

    current.total += rating;
    current.count += 1;

    map.set(row.restaurant_id, current);
  }

  return map;
}

export async function getPublicRestaurants({
  query = "",
  city = "",
  tag = "",
  priceRange = "",
  limit = 60,
}: GetPublicRestaurantsParams = {}) {
  const cacheKey = `public-restaurants:${query}:${city}:${tag}:${priceRange}:${limit}:ratings-v2`;

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
      latitude,
      longitude,
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

  const rawRestaurants = (data || []) as PublicRestaurant[];
  const restaurantIds = rawRestaurants.map((item) => item.id).filter(Boolean);

  let ratingMap = new Map<string, { total: number; count: number }>();

  if (restaurantIds.length > 0) {
    const { data: reviewRows, error: reviewError } = await supabase
      .from("restaurant_reviews")
      .select("restaurant_id, rating")
      .in("restaurant_id", restaurantIds);

    if (reviewError) {
      console.error("getPublicRestaurants review error:", reviewError);
    } else {
      ratingMap = buildRatingMap((reviewRows || []) as ReviewRatingRow[]);
    }
  }

  const normalizedQuery = normalizeText(query);
  const normalizedCity = normalizeText(city);
  const normalizedTag = normalizeText(tag);

  const restaurants = rawRestaurants
    .map((restaurant) => {
      const ratingInfo = ratingMap.get(restaurant.id);
      const totalReviews = ratingInfo?.count || 0;
      const averageRating =
        totalReviews > 0 ? ratingInfo!.total / totalReviews : 5;

      return {
        ...restaurant,
        average_rating: Number(averageRating.toFixed(1)),
        total_reviews: totalReviews,
      };
    })
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

  await setCache(cacheKey, restaurants, Math.min(CACHE_TTL.PUBLIC_RESTAURANTS, 60));

  return restaurants;
}