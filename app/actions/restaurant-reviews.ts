"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { deleteCacheByPattern } from "@/lib/cache/cache";
import { requireUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/security/rate-limit";

export type ReviewActionState = {
  success: boolean;
  message: string;
};

function cleanText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

async function getActionIp() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return realIp || "unknown";
}

export async function createRestaurantReview(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  try {
    const user = await requireUser();
    const clientIp = await getActionIp();

    // Chạy 2 rate limit checks song song
    const [ipLimit, userLimit] = await Promise.all([
      rateLimit({
        key: `review:create:ip:${clientIp}`,
        limit: 40,
        windowMs: 60 * 60 * 1000,
      }),
      rateLimit({
        key: `review:create:user:${user.id}`,
        limit: 8,
        windowMs: 60 * 60 * 1000,
      }),
    ]);

    if (!ipLimit.success) {
      return {
        success: false,
        message: "Anh gửi review quá nhanh. Vui lòng thử lại sau.",
      };
    }

    if (!userLimit.success) {
      return {
        success: false,
        message: "Anh đã gửi nhiều review trong thời gian ngắn.",
      };
    }

    if (!user.email) {
      return {
        success: false,
        message: "Anh cần đăng nhập để viết review.",
      };
    }

    const restaurantId = cleanText(formData.get("restaurantId"));
    const bookingId = cleanText(formData.get("bookingId"));
    const slug = cleanText(formData.get("slug"));
    const rating = Number(formData.get("rating") || 0);
    const comment = cleanText(formData.get("comment"));

    if (!restaurantId || !bookingId || !slug) {
      return {
        success: false,
        message: "Thiếu thông tin review.",
      };
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return {
        success: false,
        message: "Điểm đánh giá phải từ 1 đến 5 sao.",
      };
    }

    if (!comment) {
      return {
        success: false,
        message: "Anh vui lòng nhập nội dung review.",
      };
    }

    if (comment.length > 200) {
      return {
        success: false,
        message: "Review tối đa 200 ký tự.",
      };
    }

    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select("id, restaurant_id, customer_name, email, status")
      .eq("id", bookingId)
      .eq("restaurant_id", restaurantId)
      .eq("email", user.email)
      .eq("status", "completed")
      .maybeSingle();

    if (bookingError || !booking) {
      return {
        success: false,
        message:
          "Chỉ khách đã có booking completed tại nhà hàng này mới được review.",
      };
    }

    const { data: existingReview } = await adminClient
      .from("restaurant_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingReview) {
      return {
        success: false,
        message: "Booking này đã được review rồi.",
      };
    }

    const { error } = await adminClient.from("restaurant_reviews").insert({
      restaurant_id: restaurantId,
      booking_id: bookingId,
      customer_id: user.id,
      customer_name: booking.customer_name || user.email,
      rating,
      comment,
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    await Promise.all([
      deleteCacheByPattern(`public:restaurant:${restaurantId}:reviews:*`),
      deleteCacheByPattern(`public:restaurant:*:reviews:*`),
      deleteCacheByPattern(`public:restaurants:*`),
      revalidatePath(`/restaurants/${slug}`),
    ]);

    return {
      success: true,
      message: "Cảm ơn anh. Review đã được ghi nhận.",
    };
  } catch (error) {
    console.error("CREATE_RESTAURANT_REVIEW_ERROR:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        message: "Anh cần đăng nhập để viết review.",
      };
    }

    return {
      success: false,
      message: "Không thể gửi review lúc này.",
    };
  }
}