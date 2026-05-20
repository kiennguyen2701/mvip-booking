import { redirect } from "next/navigation";
import CustomerDashboardClient from "@/components/customer-dashboard-client";
import { createClient } from "@/lib/supabase/server";

type ReviewRow = {
  restaurant_id: string | null;
  rating: number | null;
};

type RatingInfo = {
  total: number;
  count: number;
};

function buildRatingMap(rows: ReviewRow[]) {
  const map = new Map<string, RatingInfo>();

  for (const row of rows) {
    if (!row.restaurant_id) continue;

    const rating = Number(row.rating || 0);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;

    const current = map.get(row.restaurant_id) || { total: 0, count: 0 };

    current.total += rating;
    current.count += 1;

    map.set(row.restaurant_id, current);
  }

  return map;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export default async function CustomerPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, email, role, referred_by_ref_code, preferred_language")
    .eq("id", user.id)
    .maybeSingle();

  const role = profileRow?.role || user.user_metadata?.role;

  if (role && role !== "customer") {
    redirect("/dashboard");
  }

  const { data: restaurantsData, error: restaurantsError } = await supabase
    .from("restaurants")
    .select(
      `
        id,
        name,
        name_zh,
        slug,
        address,
        address_zh,
        city,
        city_zh,
        cuisine_type,
        cuisine_type_zh,
        category,
        category_zh,
        description,
        description_zh,
        short_description,
        short_description_zh,
        cover_image,
        image_url,
        latitude,
        longitude,
        price_range,
        discount_percent,
        created_at
      `,
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (restaurantsError) {
    console.error("CUSTOMER_DASHBOARD_RESTAURANTS_ERROR:", restaurantsError);
  }

  const restaurants = restaurantsData || [];
  const restaurantIds = restaurants
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));

  let ratingMap = new Map<string, RatingInfo>();

  if (restaurantIds.length > 0) {
    const allReviewRows: ReviewRow[] = [];
    const chunks = chunkArray(restaurantIds, 150);

    for (const chunk of chunks) {
      const { data: reviewRows, error: reviewError } = await supabase
        .from("restaurant_reviews")
        .select("restaurant_id, rating")
        .in("restaurant_id", chunk);

      if (reviewError) {
        console.error("CUSTOMER_DASHBOARD_REVIEW_RATING_ERROR:", reviewError);
        continue;
      }

      allReviewRows.push(...((reviewRows || []) as ReviewRow[]));
    }

    ratingMap = buildRatingMap(allReviewRows);
  }

  const restaurantsWithRatings = restaurants.map((restaurant) => {
    const ratingInfo = ratingMap.get(restaurant.id);
    const totalReviews = ratingInfo?.count || 0;
    const averageRating = totalReviews > 0 ? ratingInfo!.total / totalReviews : 5;

    return {
      ...restaurant,
      average_rating: Number(averageRating.toFixed(1)),
      total_reviews: totalReviews,
    };
  });

  return (
    <CustomerDashboardClient
      profile={{
        fullName:
          profileRow?.full_name ||
          user.user_metadata?.full_name ||
          user.email ||
          "Customer",
        email: profileRow?.email || user.email || "",
        refCode: profileRow?.referred_by_ref_code || "",
        preferredLanguage:
          profileRow?.preferred_language === "zh" ? "zh" : "en",
      }}
      restaurants={restaurantsWithRatings}
    />
  );
}