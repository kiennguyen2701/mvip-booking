import { createClient } from "@/lib/supabase/server";
import { getCache, setCache } from "@/lib/cache/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/cache/keys";

// Chỉ select các cột cần thiết cho danh sách — đúng với schema thực tế trên DB.
// Loại bỏ: full_description, gallery_images, menu_images, opening_hours,
//          amenities, admin_note, verification_note, v.v.
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
  cover_image_url,
  image_url,
  short_description,
  short_description_zh,
  description,
  cuisine_type,
  cuisine_type_zh,
  category,
  category_zh,
  tags,
  category_tags,
  latitude,
  longitude,
  price_range,
  price_from,
  discount_percent,
  customer_discount_percent,
  is_active,
  is_featured,
  is_top_30_for_foreign_guests,
  has_rooftop,
  has_buffet,
  has_fine_dining,
  tier,
  district,
  country,
  booking_priority_score,
  created_at,
  updated_at
` as const;

export type PublicRestaurant = {
  id: string;
  name: string | null;
  name_zh?: string | null;
  slug: string | null;

  city: string | null;
  city_zh?: string | null;
  address: string | null;
  address_zh?: string | null;
  district?: string | null;
  country?: string | null;

  cover_image: string | null;
  cover_image_url?: string | null;
  image_url?: string | null;

  short_description?: string | null;
  short_description_zh?: string | null;
  description?: string | null;

  cuisine_type?: string | null;
  cuisine_type_zh?: string | null;
  category?: string | null;
  category_zh?: string | null;

  tags?: string[] | null;
  category_tags?: string[] | null;

  latitude?: number | null;
  longitude?: number | null;

  price_range?: string | null;
  price_from?: number | null;
  discount_percent?: number | null;
  customer_discount_percent?: number | null;

  is_active?: boolean | null;
  is_featured?: boolean | null;
  is_top_30_for_foreign_guests?: boolean | null;
  has_rooftop?: boolean | null;
  has_buffet?: boolean | null;
  has_fine_dining?: boolean | null;

  tier?: string | null;
  booking_priority_score?: number | null;

  created_at?: string | null;
  updated_at?: string | null;

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

    const current = map.get(row.restaurant_id) || { total: 0, count: 0 };
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
  const cacheKey = getCacheKey({ query, city, tag, priceRange, limit });

  const cached = await getCache<PublicRestaurant[]>(cacheKey);
  if (cached) return cached;

  const supabase = await createClient();

  let request = supabase
    .from("restaurants")
    .select(LIST_SELECT)
    .eq("is_active", true)
    .order("booking_priority_score", { ascending: false, nullsFirst: false })
    .order("is_featured", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
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

  const allTags = (item: PublicRestaurant) => [
    ...(Array.isArray(item.tags) ? item.tags : []),
    ...(Array.isArray(item.category_tags) ? item.category_tags : []),
  ];

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
      const tags = allTags(restaurant);

      const matchQuery =
        !normalizedQuery ||
        includesNormalized(restaurant.name, normalizedQuery) ||
        includesNormalized(restaurant.name_zh, normalizedQuery) ||
        includesNormalized(restaurant.address, normalizedQuery) ||
        includesNormalized(restaurant.address_zh, normalizedQuery) ||
        includesNormalized(restaurant.city, normalizedQuery) ||
        includesNormalized(restaurant.city_zh, normalizedQuery) ||
        includesNormalized(restaurant.district, normalizedQuery) ||
        includesNormalized(restaurant.cuisine_type, normalizedQuery) ||
        includesNormalized(restaurant.cuisine_type_zh, normalizedQuery) ||
        includesNormalized(restaurant.category, normalizedQuery) ||
        includesNormalized(restaurant.category_zh, normalizedQuery) ||
        includesNormalized(restaurant.description, normalizedQuery) ||
        includesNormalized(restaurant.short_description, normalizedQuery) ||
        includesNormalized(restaurant.short_description_zh, normalizedQuery) ||
        tags.some((t) => includesNormalized(t, normalizedQuery));

      const matchCity =
        !normalizedCity ||
        includesNormalized(restaurant.city, normalizedCity) ||
        includesNormalized(restaurant.city_zh, normalizedCity) ||
        includesNormalized(restaurant.district, normalizedCity);

      const matchTag =
        !normalizedTag ||
        tags.some((t) => includesNormalized(t, normalizedTag)) ||
        includesNormalized(restaurant.cuisine_type, normalizedTag) ||
        includesNormalized(restaurant.cuisine_type_zh, normalizedTag) ||
        includesNormalized(restaurant.category, normalizedTag) ||
        includesNormalized(restaurant.category_zh, normalizedTag);

      return matchQuery && matchCity && matchTag;
    });

  await setCache(cacheKey, restaurants, CACHE_TTL.PUBLIC_RESTAURANTS);

  return restaurants;
}
