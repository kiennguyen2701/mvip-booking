import RestaurantCard from "@/components/restaurants/restaurant-card";
import {
  getPublicRestaurants,
  type PublicRestaurant,
} from "@/lib/restaurants/get-public-restaurants";

type SearchParams = Promise<{
  q?: string;
  city?: string;
  tag?: string;
  price_range?: string;
}>;

export const dynamic = "force-dynamic";

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const q = params.q ?? "";
  const city = params.city ?? "";
  const tag = params.tag ?? "";
  const priceRange = params.price_range ?? "";

  const restaurants = await getPublicRestaurants({
    query: q,
    city,
    tag,
    priceRange,
    limit: 50,
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Khám phá nhà hàng phù hợp với bạn
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Tìm nhà hàng theo khu vực, phong cách, mức giá và trải nghiệm phù hợp.
            </p>
          </div>

          <form
            action="/restaurants"
            method="get"
            className="mt-8 grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"
          >
            <div className="md:col-span-2">
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-medium text-slate-800"
              >
                Tìm kiếm
              </label>
              <input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Seafood, rooftop, romantic, family..."
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="mb-2 block text-sm font-medium text-slate-800"
              >
                Thành phố
              </label>
              <input
                id="city"
                name="city"
                defaultValue={city}
                placeholder="Hà Nội"
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="price_range"
                className="mb-2 block text-sm font-medium text-slate-800"
              >
                Mức giá
              </label>
              <select
                id="price_range"
                name="price_range"
                defaultValue={priceRange}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Tất cả</option>
                <option value="$">$</option>
                <option value="$$">$$</option>
                <option value="$$$">$$$</option>
                <option value="$$$$">$$$$</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="tag"
                className="mb-2 block text-sm font-medium text-slate-800"
              >
                Tag
              </label>
              <input
                id="tag"
                name="tag"
                defaultValue={tag}
                placeholder="rooftop"
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Tìm nhà hàng
              </button>

              <a
                href="/restaurants"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Reset
              </a>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Danh sách nhà hàng
            </h2>
            <p className="text-sm text-slate-500">
              Tìm thấy {restaurants.length} nhà hàng phù hợp
            </p>
          </div>
        </div>

        {restaurants.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Chưa có nhà hàng phù hợp
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Anh thử đổi từ khóa, thành phố, tag hoặc mức giá.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {restaurants.map((restaurant: PublicRestaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}