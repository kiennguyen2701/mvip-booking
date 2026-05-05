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
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#070604] pb-24 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -left-44 top-40 h-[420px] w-[420px] rounded-full bg-orange-800/20 blur-3xl" />
        <div className="absolute right-[-180px] bottom-0 h-[460px] w-[460px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.11)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <section className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 py-4 md:px-6 md:py-6">
        <div className="mb-4 flex min-w-0 items-center gap-2 text-xs text-slate-400 md:text-sm">
          <Link href="/restaurants" className="shrink-0 font-bold hover:text-amber-200">
            Restaurants
          </Link>
          <span className="shrink-0">/</span>
          <span className="min-w-0 truncate font-black text-white">
            {restaurant.name}
          </span>
        </div>

        {!restaurant.is_active && (
          <div className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
            Preview Mode — this restaurant is currently inactive and only visible to owner/admin.
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
                  This restaurant is inactive. Customers cannot book until Admin approves and activates it.
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