import Link from "next/link";
import { notFound } from "next/navigation";
import RestaurantGallery from "@/components/restaurants/restaurant-gallery";
import RestaurantBookingForm from "@/components/restaurants/restaurant-booking-form";
import RestaurantInfoTabs from "@/components/restaurants/restaurant-info-tabs";
import { getPublicRestaurantDetail } from "@/lib/restaurants/get-public-restaurant-detail";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function RestaurantDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getPublicRestaurantDetail(slug);

  if (!restaurant) notFound();

  return (
    <main className="relative min-h-screen bg-[#070604] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -left-56 top-40 h-[520px] w-[520px] rounded-full bg-orange-800/20 blur-3xl" />
        <div className="absolute -right-56 bottom-0 h-[560px] w-[560px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.11)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-400 md:text-sm">
          <Link href="/restaurants" className="font-bold hover:text-amber-200">
            Restaurants
          </Link>
          <span>/</span>
          <span className="line-clamp-1 font-black text-white">
            {restaurant.name}
          </span>
        </div>

        {!restaurant.is_active && (
          <div className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
            Preview Mode — this restaurant is currently inactive and only
            visible to owner/admin.
          </div>
        )}

        <section className="relative mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/35 backdrop-blur-2xl md:rounded-[34px] md:p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/10 via-transparent to-orange-800/20" />

          <div className="relative grid gap-4 md:grid-cols-[1fr_260px] md:items-center lg:grid-cols-[1fr_310px]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300 md:text-xs">
                Luxury Dining Partner
              </p>

              <h1 className="mt-3 text-4xl font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.7)] md:text-5xl lg:text-6xl">
                {restaurant.name}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-200 md:text-xs">
                  Premium Selection
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-300 md:text-xs">
                  Instant Booking
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-300 md:text-xs">
                  Fine Dining
                </span>
              </div>
            </div>

            <div className="rounded-[24px] border border-amber-300/20 bg-gradient-to-br from-amber-300/20 to-yellow-700/10 p-4 text-center shadow-xl shadow-amber-900/15 backdrop-blur-xl md:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200">
                Exclusive Offer
              </p>

              <p className="mt-1 text-4xl font-black text-amber-300 md:text-5xl">
                -5%
              </p>

              <p className="mt-1 text-xs font-bold leading-5 text-slate-300">
                Instant customer discount
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/30 backdrop-blur-xl md:rounded-[38px]">
              <RestaurantGallery
                name={restaurant.name || "Restaurant"}
                coverImage={restaurant.cover_image}
                galleryImages={restaurant.gallery_images || []}
              />
            </div>

            <RestaurantInfoTabs
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
            />
          </div>

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
      </section>
    </main>
  );
}