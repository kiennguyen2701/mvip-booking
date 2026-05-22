import { redirect } from "next/navigation";
import CustomerDashboardClient from "@/components/customer-dashboard-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReviewRow = {
  restaurant_id: string | null;
  rating: number | null;
};

function buildRatingMap(rows: ReviewRow[]) {
  const map = new Map<string, { total: number; count: number }>();

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

  const [profileResult, restaurantsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role, referred_by_ref_code, preferred_language")
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("restaurants")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const profileRow = profileResult.data;
  const role = profileRow?.role || user.user_metadata?.role;

  if (role && role !== "customer") {
    redirect("/dashboard");
  }

  if (restaurantsResult.error) {
    console.error(
      "CUSTOMER_DASHBOARD_RESTAURANTS_ERROR:",
      restaurantsResult.error,
    );
  }

  const restaurants = restaurantsResult.data || [];
  const restaurantIds = restaurants
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));

  let ratingMap = new Map<string, { total: number; count: number }>();

  if (restaurantIds.length > 0) {
    const allReviewRows: ReviewRow[] = [];
    const chunks = chunkArray(restaurantIds, 150);

    const reviewResults = await Promise.all(
      chunks.map((chunk) =>
        supabase
          .from("restaurant_reviews")
          .select("restaurant_id, rating")
          .in("restaurant_id", chunk),
      ),
    );

    for (const result of reviewResults) {
      if (result.error) {
        console.error("CUSTOMER_DASHBOARD_REVIEW_RATING_ERROR:", result.error);
        continue;
      }

      allReviewRows.push(...((result.data || []) as ReviewRow[]));
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