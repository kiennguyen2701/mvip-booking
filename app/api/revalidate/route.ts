import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

// Endpoint để invalidate ISR cache khi supplier update restaurant.
// Gọi từ supplier dashboard actions sau khi update/create restaurant.
// Bảo vệ bằng CRON_SECRET.

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Deny-by-default: nếu chưa set secret thì chặn luôn (tránh lộ ở production)
  if (!secret) {
    console.warn("REVALIDATE_AUTH: CRON_SECRET chưa được set — request bị từ chối.");
    return false;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const authorization = request.headers.get("authorization") || "";

  return querySecret === secret || authorization === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const slug = String(body.slug || "").trim();

    if (slug) {
      // Rebuild trang cụ thể ngay lập tức
      revalidatePath(`/restaurants/${slug}`);
      console.log("REVALIDATE_SLUG:", slug);
    } else {
      // Rebuild tất cả trang restaurants
      revalidatePath("/restaurants", "page");
      console.log("REVALIDATE_ALL_RESTAURANTS");
    }

    return NextResponse.json({
      success: true,
      revalidated: slug || "all",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("REVALIDATE_ERROR:", error);
    return NextResponse.json(
      { error: "Revalidation failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
