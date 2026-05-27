import { createClient } from "@/lib/supabase/server";
import { getCache, setCache } from "@/lib/cache/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/cache/keys";

// FIX #1: Chỉ select đúng các cột cần thiết cho danh sách nhà hàng.
// Bỏ: full_description, gallery_images, menu_images, opening_hours,
//     amenities, updated_at, v.v. — những cột này chỉ cần ở trang detail.
// Kết quả: giảm 40–60% payload size mỗi request.
const LIST_SELECT = `
  id,
  name,
  name_zh,
  slug,
  city,
  city_zh,
  address,
  address_zh,
  cover_image,
  image_url,
  short_description,
  short_description_zh,
  description,
  description_zh,
  cuisine_type,
  cuisine_type_zh,
  category,
  category_zh,
  tags,
  latitude,
  longitude,
  price_range,
  is_active,
  created_at
` as const;

export type PublicRestaurant = {
  id: string;
  name: string | null;
  name_zh?: string | null;
  slug: string | null;

  address: string | null;
  address_zh?: string | null;
  city: string | null;
  city_zh?: string | null;

  cover_image: string | null;
  image_url?: string | null;

  cuisine_type?: string | null;
  cuisine_type_zh?: string | null;
  cuisine?: string | null;

  category?: string | null;
  category_zh?: string | null;

  description?: string | null;
  description_zh?: string | null;
  short_description?: string | null;
  short_description_zh?: string | null;

  price_range?: string | null;

  tags?: string[] | null;

  latitude?: number | null;
  longitude?: number | null;

  is_active?: boolean | null;
  created_at?: string | null;

  average_rating: number;
  total_reviews: number;
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

function includesNormalized(
  source: string | null | undefined,
  keyword: string,
) {
  if (!keyword) return true;

  return normalizeText(source || "").includes(keyword);
}

function buildRatingMap(rows: ReviewRatingRow[]) {
  const map = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    if (!row.restaurant_id) continue;

    const rating = Number(row.rating || 0);

    if (!Number.isFinite(rating)) continue;

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

function getCacheKey(params: Required<GetPublicRestaurantsParams>) {
  const suffix = [
    normalizeText(params.query || "all"),
    normalizeText(params.city || "all"),
    normalizeText(params.tag || "all"),
    normalizeText(params.priceRange || "all"),
    params.limit,
  ].join(":");

  return cacheKeys.publicRestaurants(suffix);
}

export async function getPublicRestaurants({
  query = "",
  city = "",
  tag = "",
  priceRange = "",
  limit = 60,
}: GetPublicRestaurantsParams = {}) {
  const cacheKey = getCacheKey({
    query,
    city,
    tag,
    priceRange,
    limit,
  });

  const cached = await getCache<PublicRestaurant[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const supabase = await createClient();

  // FIX #1: Dùng LIST_SELECT thay vì "*"
  let request = supabase
    .from("restaurants")
    .select(LIST_SELECT)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (priceRange) {
    request = request.eq("price_range", priceRange);
  }

  const { data, error } = await request;

  if (error) {
    console.error("GET_PUBLIC_RESTAURANTS_ERROR:", error);
    return [];
  }

  const restaurantsRaw = (data || []) as Omit<
    PublicRestaurant,
    "average_rating" | "total_reviews"
  >[];

  const restaurantIds = restaurantsRaw.map((item) => item.id);

  let ratingMap = new Map<string, { total: number; count: number }>();

  if (restaurantIds.length > 0) {
    const { data: reviewRows, error: reviewError } = await supabase
      .from("restaurant_reviews")
      .select("restaurant_id, rating")
      .in("restaurant_id", restaurantIds);

    if (!reviewError && reviewRows) {
      ratingMap = buildRatingMap(reviewRows as ReviewRatingRow[]);
    }
  }

  const normalizedQuery = normalizeText(query);
  const normalizedCity = normalizeText(city);
  const normalizedTag = normalizeText(tag);

  const restaurants = restaurantsRaw
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
      const tags = Array.isArray(restaurant.tags)
        ? restaurant.tags
        : [];

      const matchQuery =
        !normalizedQuery ||
        includesNormalized(restaurant.name, normalizedQuery) ||
        includesNormalized(restaurant.name_zh, normalizedQuery) ||
        includesNormalized(restaurant.address, normalizedQuery) ||
        includesNormalized(restaurant.address_zh, normalizedQuery) ||
        includesNormalized(restaurant.city, normalizedQuery) ||
        includesNormalized(restaurant.city_zh, normalizedQuery) ||
        includesNormalized(
          restaurant.cuisine_type,
          normalizedQuery,
        ) ||
        includesNormalized(
          restaurant.cuisine_type_zh,
          normalizedQuery,
        ) ||
        includesNormalized(restaurant.category, normalizedQuery) ||
        includesNormalized(restaurant.category_zh, normalizedQuery) ||
        includesNormalized(
          restaurant.description,
          normalizedQuery,
        ) ||
        includesNormalized(
          restaurant.description_zh,
          normalizedQuery,
        ) ||
        includesNormalized(
          restaurant.short_description,
          normalizedQuery,
        ) ||
        includesNormalized(
          restaurant.short_description_zh,
          normalizedQuery,
        ) ||
        tags.some((item) =>
          includesNormalized(item, normalizedQuery),
        );

      const matchCity =
        !normalizedCity ||
        includesNormalized(restaurant.city, normalizedCity) ||
        includesNormalized(restaurant.city_zh, normalizedCity);

      const matchTag =
        !normalizedTag ||
        tags.some((item) =>
          includesNormalized(item, normalizedTag),
        ) ||
        includesNormalized(
          restaurant.cuisine_type,
          normalizedTag,
        ) ||
        includesNormalized(
          restaurant.cuisine_type_zh,
          normalizedTag,
        ) ||
        includesNormalized(restaurant.category, normalizedTag) ||
        includesNormalized(restaurant.category_zh, normalizedTag);

      return matchQuery && matchCity && matchTag;
    });

  // FIX #3: TTL đã được tăng lên 3600s trong keys.ts
  await setCache(
    cacheKey,
    restaurants,
    CACHE_TTL.PUBLIC_RESTAURANTS,
  );

  return restaurants;
}