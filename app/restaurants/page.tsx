import RestaurantCard from "@/components/restaurants/restaurant-card";
import {
  getPublicRestaurants,
  type PublicRestaurant,
} from "@/lib/restaurants/get-public-restaurants";

type SearchParams = {
  q?: string;
  city?: string;
  tag?: string;
  price_range?: string;
};

export const revalidate = 60; // ✅ cache 60s

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = searchParams.q?.trim() ?? "";
  const city = searchParams.city?.trim() ?? "";
  const tag = searchParams.tag?.trim() ?? "";
  const priceRange = searchParams.price_range?.trim() ?? "";

  const restaurants = await getPublicRestaurants({
    query: q,
    city,
    tag,
    priceRange,
    limit: 60,
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50">
      {/* HEADER */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
          <h1 className="text-2xl font-black text-slate-950 md:text-4xl">
            Khám phá nhà hàng
          </h1>

          {/* SEARCH FORM */}
          <form
            action="/restaurants"
            method="get"
            className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border bg-slate-50 p-3 md:grid-cols-4"
          >
            <input
              name="q"
              defaultValue={q}
              placeholder="Search..."
              className="h-11 rounded-xl border px-3"
            />

            <input
              name="city"
              defaultValue={city}
              placeholder="City"
              className="h-11 rounded-xl border px-3"
            />

            <input
              name="tag"
              defaultValue={tag}
              placeholder="Tag"
              className="h-11 rounded-xl border px-3"
            />

            <div className="flex gap-2">
              <button className="flex-1 rounded-xl bg-black text-white">
                Search
              </button>

              <a
                href="/restaurants"
                className="flex-1 rounded-xl border text-center"
              >
                Reset
              </a>
            </div>
          </form>
        </div>
      </section>

      {/* LIST */}
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <p className="mb-4 text-sm text-slate-500">
          {restaurants.length} restaurants
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {restaurants.map((r: PublicRestaurant) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      </section>
    </main>
  );
}