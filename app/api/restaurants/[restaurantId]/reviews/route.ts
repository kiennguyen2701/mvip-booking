import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  try {
    const { restaurantId } = await context.params;
    const url = new URL(request.url);

    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
    const limit = Math.min(
      20,
      Math.max(1, Number(url.searchParams.get("limit") || 10)),
    );

    const { data, error } = await adminClient
      .from("restaurant_reviews")
      .select("id, customer_name, rating, comment, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      reviews: data || [],
    });
  } catch (error) {
    console.error("GET_RESTAURANT_REVIEWS_ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to load reviews.",
      },
      {
        status: 500,
      },
    );
  }
}