import { getPublicRestaurants } from "@/lib/restaurants/get-public-restaurants";
import RestaurantCard from "@/components/restaurants/restaurant-card";

export const revalidate = 3600;

export default async function RestaurantsPage() {
  const restaurants = await getPublicRestaurants({ limit: 60 });

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#080704] px-4 py-8 text-white md:px-6 md:py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-160px] h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.08)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <section className="relative mx-auto w-full max-w-7xl">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
            Mvip Booking
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
            Premium Restaurants
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {restaurants.length} restaurants available
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
            />
          ))}
        </div>

        {restaurants.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            No restaurants available yet.
          </div>
        )}
      </section>
    </main>
  );
}
