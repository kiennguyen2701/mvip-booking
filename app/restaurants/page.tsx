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

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const city = params.city?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";
  const priceRange = params.price_range?.trim() ?? "";

  const restaurants = await getPublicRestaurants({
    query: q,
    city,
    tag,
    priceRange,
    limit: 60,
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-7 md:px-6 md:py-10">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
              Khám phá nhà hàng phù hợp với bạn
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
              Tìm nhà hàng theo khu vực, phong cách, mức giá và trải nghiệm phù hợp.
            </p>
          </div>

          <form
            action="/restaurants"
            method="get"
            className="mt-6 grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 md:mt-8 md:grid-cols-4 md:gap-4 md:p-4"
          >
            <div className="md:col-span-2">
              <label htmlFor="q" className="mb-2 block text-sm font-bold text-slate-800">
                Tìm kiếm
              </label>
              <input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Seafood, rooftop, romantic..."
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label htmlFor="city" className="mb-2 block text-sm font-bold text-slate-800">
                Thành phố
              </label>
              <input
                id="city"
                name="city"
                defaultValue={city}
                placeholder="Hà Nội"
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label htmlFor="price_range" className="mb-2 block text-sm font-bold text-slate-800">
                Mức giá
              </label>
              <select
                id="price_range"
                name="price_range"
                defaultValue={priceRange}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Tất cả</option>
                <option value="$">$</option>
                <option value="$$">$$</option>
                <option value="$$$">$$$</option>
                <option value="$$$$">$$$$</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="tag" className="mb-2 block text-sm font-bold text-slate-800">
                Tag
              </label>
              <input
                id="tag"
                name="tag"
                defaultValue={tag}
                placeholder="rooftop"
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Tìm
              </button>

              <a
                href="/restaurants"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                Reset
              </a>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-7 md:px-6 md:py-10">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950">Danh sách nhà hàng</h2>
          <p className="text-sm font-medium text-slate-500">
            Tìm thấy {restaurants.length} nhà hàng phù hợp
          </p>
        </div>

        {restaurants.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Chưa có nhà hàng phù hợp</h3>
            <p className="mt-2 text-sm text-slate-500">
              Anh thử đổi từ khóa, thành phố, tag hoặc mức giá.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {restaurants.map((restaurant: PublicRestaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}