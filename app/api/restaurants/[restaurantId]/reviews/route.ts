import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    restaurantId: string;
  }>;
};

type RatingSummary = {
  totalReviews: number;
  averageRating: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
};

export const dynamic = "force-dynamic";

function emptySummary(): RatingSummary {
  return {
    totalReviews: 0,
    averageRating: 5,
    breakdown: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  };
}

async function getReviewPermission(restaurantId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return {
      canReview: false,
      completedBookingId: null,
      alreadyReviewed: false,
    };
  }

  const { data: completedBookings } = await adminClient
    .from("bookings")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("email", user.email)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);

  const bookingIds = (completedBookings || []).map((booking) => booking.id);

  if (bookingIds.length === 0) {
    return {
      canReview: false,
      completedBookingId: null,
      alreadyReviewed: false,
    };
  }

  const { data: existingReviews } = await adminClient
    .from("restaurant_reviews")
    .select("booking_id")
    .in("booking_id", bookingIds);

  const reviewedBookingIds = new Set(
    (existingReviews || []).map((item) => item.booking_id),
  );

  const availableBooking = (completedBookings || []).find(
    (booking) => !reviewedBookingIds.has(booking.id),
  );

  return {
    canReview: Boolean(availableBooking?.id),
    completedBookingId: availableBooking?.id || null,
    alreadyReviewed: !availableBooking && reviewedBookingIds.size > 0,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { restaurantId } = await context.params;
    const url = new URL(request.url);

    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
    const limit = Math.min(
      20,
      Math.max(1, Number(url.searchParams.get("limit") || 10)),
    );

    const ratingFilter = Number(url.searchParams.get("rating") || 0);

    const [{ data: ratingRows, error: ratingError }, permission] =
      await Promise.all([
        adminClient
          .from("restaurant_reviews")
          .select("rating")
          .eq("restaurant_id", restaurantId),
        getReviewPermission(restaurantId),
      ]);

    if (ratingError) {
      return NextResponse.json({ error: ratingError.message }, { status: 500 });
    }

    const summary = emptySummary();

    for (const row of ratingRows || []) {
      const rating = Number(row.rating || 0);

      if (rating >= 1 && rating <= 5) {
        summary.breakdown[rating as 1 | 2 | 3 | 4 | 5] += 1;
        summary.totalReviews += 1;
      }
    }

    if (summary.totalReviews > 0) {
      const totalScore = Object.entries(summary.breakdown).reduce(
        (sum, [rating, count]) => sum + Number(rating) * Number(count),
        0,
      );

      summary.averageRating = Number(
        (totalScore / summary.totalReviews).toFixed(1),
      );
    }

    let reviewRequest = adminClient
      .from("restaurant_reviews")
      .select("id, customer_name, rating, comment, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (ratingFilter >= 1 && ratingFilter <= 5) {
      reviewRequest = reviewRequest.eq("rating", ratingFilter);
    }

    const { data: reviews, error: reviewsError } = await reviewRequest.range(
      offset,
      offset + limit - 1,
    );

    if (reviewsError) {
      return NextResponse.json({ error: reviewsError.message }, { status: 500 });
    }

    return NextResponse.json({
      reviews: reviews || [],
      summary,
      ...permission,
    });
  } catch (error) {
    console.error("GET_RESTAURANT_REVIEWS_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load reviews." },
      { status: 500 },
    );
  }
}