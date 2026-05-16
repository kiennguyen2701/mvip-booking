import { redirect } from "next/navigation";
import CustomerDashboardClient from "@/components/customer-dashboard-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RestaurantRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
  address?: string | null;
  city?: string | null;
  cuisine_type?: string | null;
  category?: string | null;
  description?: string | null;
  short_description?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price_range?: string | null;
  discount_percent?: number | null;
  is_active?: boolean | null;
  average_rating?: number | null;
  total_reviews?: number | null;
};

type ReviewRow = {
  restaurant_id: string | null;
  rating: number | null;
};

function buildRatingMap(reviews: ReviewRow[]) {
  const ratingMap = new Map<string, { total: number; count: number }>();

  for (const review of reviews) {
    if (!review.restaurant_id) continue;

    const rating = Number(review.rating || 0);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;

    const current = ratingMap.get(review.restaurant_id) || {
      total: 0,
      count: 0,
    };

    current.total += rating;
    current.count += 1;

    ratingMap.set(review.restaurant_id, current);
  }

  return ratingMap;
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
    .select("full_name, email, role, referred_by_ref_code")
    .eq("id", user.id)
    .maybeSingle();

  const role = profileRow?.role || user.user_metadata?.role;

  if (role && role !== "customer") {
    redirect("/dashboard");
  }

  const { data: restaurantsData } = await supabase
    .from("restaurants")
    .select(
      `
      id,
      name,
      slug,
      address,
      city,
      cuisine_type,
      category,
      description,
      short_description,
      cover_image,
      image_url,
      latitude,
      longitude,
      price_range,
      discount_percent,
      is_active
    `,
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const restaurants = (restaurantsData || []) as RestaurantRow[];
  const restaurantIds = restaurants.map((item) => item.id).filter(Boolean);

  let ratingMap = new Map<string, { total: number; count: number }>();

  if (restaurantIds.length > 0) {
    const { data: reviewRows, error: reviewError } = await supabase
      .from("restaurant_reviews")
      .select("restaurant_id, rating")
      .in("restaurant_id", restaurantIds);

    if (reviewError) {
      console.error("CUSTOMER_DASHBOARD_REVIEW_RATING_ERROR:", reviewError);
    } else {
      ratingMap = buildRatingMap((reviewRows || []) as ReviewRow[]);
    }
  }

  const restaurantsWithRatings = restaurants.map((restaurant) => {
    const ratingInfo = ratingMap.get(restaurant.id);
    const totalReviews = ratingInfo?.count || 0;
    const averageRating =
      totalReviews > 0 ? ratingInfo!.total / totalReviews : 5;

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
      }}
      restaurants={restaurantsWithRatings}
    />
  );
}