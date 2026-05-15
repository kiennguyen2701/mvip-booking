import { notFound } from "next/navigation";
import RestaurantGallery from "@/components/restaurants/restaurant-gallery";
import RestaurantBookingForm from "@/components/restaurants/restaurant-booking-form";
import RestaurantInfoTabs from "@/components/restaurants/restaurant-info-tabs";
import { getPublicRestaurantDetail } from "@/lib/restaurants/get-public-restaurant-detail";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type RestaurantReview = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

type ReviewSummary = {
  reviews: RestaurantReview[];
  totalReviews: number;
  averageRating: number;
  canReview: boolean;
  completedBookingId: string | null;
  alreadyReviewed: boolean;
};

async function getRestaurantReviewSummary(
  restaurantId: string,
): Promise<ReviewSummary> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    reviewsResult,
    countResult,
    averageResult,
    completedBookingResult,
  ] = await Promise.all([
    adminClient
      .from("restaurant_reviews")
      .select("id, customer_name, rating, comment, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(10),

    adminClient
      .from("restaurant_reviews")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),

    adminClient
      .from("restaurant_reviews")
      .select("rating")
      .eq("restaurant_id", restaurantId),

    user?.email
      ? adminClient
          .from("bookings")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("email", user.email)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const reviews = (reviewsResult.data || []) as RestaurantReview[];
  const totalReviews = countResult.count || 0;

  const ratings = (averageResult.data || []) as { rating: number }[];
  const averageRating = ratings.length
    ? ratings.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
      ratings.length
    : 0;

  const completedBookings =
    (completedBookingResult.data || []) as { id: string }[];

  let completedBookingId: string | null = null;
  let alreadyReviewed = false;

  if (user?.id && completedBookings.length > 0) {
    const bookingIds = completedBookings.map((booking) => booking.id);

    const { data: existingReviews } = await adminClient
      .from("restaurant_reviews")
      .select("booking_id")
      .in("booking_id", bookingIds);

    const reviewedBookingIds = new Set(
      (existingReviews || []).map((item) => item.booking_id),
    );

    const availableBooking = completedBookings.find(
      (booking) => !reviewedBookingIds.has(booking.id),
    );

    completedBookingId = availableBooking?.id || null;
    alreadyReviewed = !availableBooking && reviewedBookingIds.size > 0;
  }

  return {
    reviews,
    totalReviews,
    averageRating,
    canReview: Boolean(user?.id && completedBookingId),
    completedBookingId,
    alreadyReviewed,
  };
}

export default async function RestaurantDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const restaurant = await getPublicRestaurantDetail(slug);

  if (!restaurant) notFound();

  const reviewSummary = await getRestaurantReviewSummary(
    String(restaurant.id),
  );

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#070604] pb-24 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -left-44 top-40 h-[420px] w-[420px] rounded-full bg-orange-800/20 blur-3xl" />
        <div className="absolute right-[-180px] bottom-0 h-[460px] w-[460px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.11)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <section className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 py-4 md:px-6 md:py-6">
        {!restaurant.is_active && (
          <div className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
            Preview Mode — this restaurant is currently inactive and only
            visible to owner/admin.
          </div>
        )}

        <section className="relative mb-5 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/35 backdrop-blur-2xl md:rounded-[34px] md:p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/10 via-transparent to-orange-800/20" />

          <div className="relative grid min-w-0 gap-3 md:grid-cols-[1fr_220px] md:items-center lg:grid-cols-[1fr_260px]">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300 md:text-xs md:tracking-[0.28em]">
                Luxury Dining Partner
              </p>

              <h1 className="mt-3 max-w-full break-words text-[2.55rem] font-black leading-[1] tracking-tight text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.7)] md:text-5xl lg:text-6xl">
                {restaurant.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100">
                  ★ {reviewSummary.averageRating.toFixed(1)} / 5
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-slate-300">
                  {reviewSummary.totalReviews} reviews
                </div>
              </div>
            </div>

            <div className="-mt-1 max-w-full rounded-[18px] border border-amber-300/20 bg-gradient-to-br from-amber-300/16 to-yellow-700/10 px-4 py-3 text-center shadow-xl shadow-amber-900/10 backdrop-blur-xl md:mt-0 md:rounded-[22px] md:px-5 md:py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-200 md:text-[10px]">
                Exclusive Offer
              </p>

              <p className="mt-1 text-3xl font-black leading-none text-amber-300 md:text-4xl">
                -5%
              </p>

              <p className="mt-1 text-[11px] font-bold leading-5 text-slate-300 md:text-xs">
                Instant customer discount
              </p>
            </div>
          </div>
        </section>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 space-y-5">
            <RestaurantGallery
              name={restaurant.name || "Restaurant"}
              coverImage={restaurant.cover_image}
              galleryImages={restaurant.gallery_images || []}
            />

            <RestaurantInfoTabs
              restaurantId={restaurant.id}
              slug={restaurant.slug}
              shortDescription={restaurant.short_description}
              fullDescription={restaurant.full_description}
              openingHours={restaurant.opening_hours}
              address={restaurant.address}
              city={restaurant.city}
              latitude={restaurant.latitude}
              longitude={restaurant.longitude}
              tags={restaurant.tags}
              amenities={restaurant.amenities}
              priceRange={restaurant.price_range}
              menuImages={restaurant.menu_images || []}
              initialReviews={reviewSummary.reviews}
              totalReviews={reviewSummary.totalReviews}
              averageRating={reviewSummary.averageRating}
              canReview={reviewSummary.canReview}
              completedBookingId={reviewSummary.completedBookingId}
              alreadyReviewed={reviewSummary.alreadyReviewed}
            />
          </div>

          <div id="booking-form" className="min-w-0 scroll-mt-28">
            {restaurant.is_active ? (
              <RestaurantBookingForm
                restaurantId={restaurant.id}
                restaurantName={restaurant.name || "Restaurant"}
                supplierId={restaurant.supplier_id}
              />
            ) : (
              <aside className="self-start rounded-[30px] border border-amber-300/20 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur-2xl lg:sticky lg:top-28">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">
                  Supplier Preview
                </p>

                <h2 className="mt-3 text-2xl font-black text-white">
                  Booking Disabled
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  This restaurant is inactive. Customers cannot book until Admin
                  approves and activates it.
                </p>
              </aside>
            )}
          </div>
        </div>
      </section>

      {restaurant.is_active && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#070604]/92 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl md:hidden">
          <a
            href="#booking-form"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-amber-300 text-base font-black text-slate-950 shadow-2xl shadow-amber-950/30 active:scale-[0.99]"
          >
            Book Now
          </a>
        </div>
      )}
    </main>
  );
}