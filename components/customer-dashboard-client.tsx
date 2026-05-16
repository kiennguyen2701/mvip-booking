"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { getRestaurantImageUrl } from "@/lib/restaurants/images";

type Profile = {
  fullName: string;
  email?: string;
  refCode?: string;
};

type Restaurant = {
  id: string;
  name?: string | null;
  slug?: string | null;
  address?: string | null;
  city?: string | null;
  cuisine_type?: string | null;
  category?: string | null;
  description?: string | null;
  short_description?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price_range?: string | null;
  discount_percent?: number | null;
  average_rating?: number | null;
};

type RestaurantWithDistance = Restaurant & {
  distance: number | null;
};

type Props = {
  profile: Profile;
  restaurants: Restaurant[];
};

type SortMode = "top" | "nearby" | "popular";

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function hardLockViewport() {
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
}

function getCuisine(item: Restaurant) {
  return item.cuisine_type || item.category || "Signature Dining";
}

function getImage(item: Restaurant) {
  return (
    getRestaurantImageUrl(item.cover_image) ||
    getRestaurantImageUrl(item.image_url) ||
    ""
  );
}

function getDiscount(item: Restaurant) {
  return Number(item.discount_percent ?? 5);
}

function getAverageRating(item: Restaurant) {
  const rating = Number(item.average_rating ?? 5);

  if (!Number.isFinite(rating) || rating <= 0) {
    return "5.0";
  }

  return rating.toFixed(1);
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RestaurantCard = memo(function RestaurantCard({
  restaurant,
}: {
  restaurant: RestaurantWithDistance;
}) {
  const image = getImage(restaurant);
  const cuisine = getCuisine(restaurant);
  const discount = getDiscount(restaurant);
  const rating = getAverageRating(restaurant);

  const href = restaurant.slug
    ? `/restaurants/${restaurant.slug}`
    : `/restaurants/${restaurant.id}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className="group block w-full max-w-full overflow-hidden rounded-3xl border border-white/10 bg-[#11100c]/95 shadow-xl shadow-black/25 transition hover:border-amber-300/40"
    >
      <div className="relative h-44 w-full overflow-hidden bg-[#12100b] sm:h-56">
        {image ? (
          <img
            src={image}
            alt={restaurant.name || "Restaurant"}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#12100b] via-[#1c1407] to-[#3a2407] text-5xl">
            🍽️
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        <div className="absolute left-3 top-3 rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black text-slate-950 shadow-lg">
          {discount}% OFF
        </div>

        <div className="absolute bottom-4 left-4 right-4 min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
            {cuisine}
          </p>

          <h3 className="mt-2 line-clamp-2 break-words text-xl font-black leading-tight text-white">
            {restaurant.name || "Unnamed Restaurant"}
          </h3>
        </div>
      </div>

      <div className="w-full max-w-full overflow-hidden p-4">
        <p className="line-clamp-2 break-words text-sm leading-6 text-slate-400">
          {restaurant.short_description ||
            restaurant.description ||
            restaurant.address ||
            "Premium dining partner available for booking."}
        </p>

        <div className="mt-5 flex w-full max-w-full items-center justify-between gap-3 overflow-hidden">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-300">
            📍 {restaurant.city || "Vietnam"}
          </p>

          <span className="shrink-0 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-300">
            {rating} ★
          </span>
        </div>
      </div>
    </Link>
  );
});

export default function CustomerDashboardClient({
  profile,
  restaurants,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("top");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(9);
  const [locationStatus, setLocationStatus] = useState("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    hardLockViewport();
  }, [query, cuisine, sortMode, nearbyOnly, visibleCount]);

  function handleSearch() {
    inputRef.current?.blur();
    setQuery(input.trim());
    setVisibleCount(9);
    setTimeout(hardLockViewport, 80);
  }

  function clearFilters() {
    inputRef.current?.blur();
    setInput("");
    setQuery("");
    setCuisine("");
    setSortMode("top");
    setNearbyOnly(false);
    setVisibleCount(9);
    setLocationStatus("");
    setTimeout(hardLockViewport, 80);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Your browser does not support location services.");
      return;
    }

    setLocationStatus("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        setNearbyOnly(true);
        setSortMode("nearby");
        setVisibleCount(9);
        setLocationStatus("Nearby restaurants within 1km enabled.");
        setTimeout(hardLockViewport, 80);
      },
      () => {
        setNearbyOnly(false);
        setLocationStatus(
          "We could not access your location. You can still browse all restaurants.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000 * 60 * 5,
      },
    );
  }

  function toggleNearby() {
    if (!nearbyOnly && !userLocation) {
      requestLocation();
      return;
    }

    setNearbyOnly((current) => !current);
    setSortMode((current) => (current === "nearby" ? "top" : "nearby"));
    setVisibleCount(9);
    setTimeout(hardLockViewport, 80);
  }

  const cuisines = useMemo(() => {
    return Array.from(new Set(restaurants.map((item) => getCuisine(item))))
      .filter(Boolean)
      .sort();
  }, [restaurants]);

  const restaurantsWithDistance = useMemo<RestaurantWithDistance[]>(() => {
    return restaurants.map((item) => {
      const hasLocation =
        userLocation &&
        typeof item.latitude === "number" &&
        typeof item.longitude === "number";

      return {
        ...item,
        distance: hasLocation
          ? distanceKm(
              userLocation.lat,
              userLocation.lng,
              item.latitude as number,
              item.longitude as number,
            )
          : null,
      };
    });
  }, [restaurants, userLocation]);

  const filteredRestaurants = useMemo<RestaurantWithDistance[]>(() => {
    const keyword = normalizeSearch(query);

    return restaurantsWithDistance
      .filter((item) => {
        const searchableText = normalizeSearch(
          [
            item.name,
            getCuisine(item),
            item.description,
            item.short_description,
            item.address,
            item.city,
            "restaurant",
            "restaurants",
            "nha hang",
            "nhà hàng",
          ]
            .filter(Boolean)
            .join(" "),
        );

        const matchKeyword = !keyword || searchableText.includes(keyword);
        const matchCuisine = !cuisine || getCuisine(item) === cuisine;

        const matchNearby =
          !nearbyOnly ||
          !userLocation ||
          (item.distance !== null && item.distance <= 1);

        return matchKeyword && matchCuisine && matchNearby;
      })
      .sort((a, b) => {
        if (sortMode === "nearby") {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        }

        if (sortMode === "popular") {
          const aScore =
            (a.cover_image || a.image_url ? 20 : 0) +
            (a.short_description ? 10 : 0) +
            (a.city ? 8 : 0);

          const bScore =
            (b.cover_image || b.image_url ? 20 : 0) +
            (b.short_description ? 10 : 0) +
            (b.city ? 8 : 0);

          return bScore - aScore;
        }

        const aScore =
          (a.cover_image || a.image_url ? 50 : 0) +
          (a.name ? 10 : 0) +
          (a.short_description ? 10 : 0);

        const bScore =
          (b.cover_image || b.image_url ? 50 : 0) +
          (b.name ? 10 : 0) +
          (b.short_description ? 10 : 0);

        return bScore - aScore;
      });
  }, [
    restaurantsWithDistance,
    query,
    cuisine,
    sortMode,
    nearbyOnly,
    userLocation,
  ]);

  const visibleRestaurants = filteredRestaurants.slice(0, visibleCount);

  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#050403] pb-10 text-white">
      <div className="pointer-events-none absolute inset-0 w-full max-w-full overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl md:h-[560px] md:w-[560px]" />
        <div className="absolute right-0 top-40 h-[220px] w-[220px] rounded-full bg-orange-900/20 blur-3xl md:h-[440px] md:w-[440px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(251,191,36,0.12)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl overflow-x-hidden px-3 py-5 sm:px-4 md:px-6 md:py-8">
        <section className="relative mx-auto w-full max-w-full overflow-hidden rounded-[1.5rem] border border-amber-300/15 bg-[#11100c]/95 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.55)] md:rounded-[2.4rem] md:p-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-24 h-60 w-60 rounded-full bg-amber-400/10 blur-3xl md:h-72 md:w-72" />
            <div className="absolute right-0 top-8 h-64 w-64 rounded-full bg-orange-700/10 blur-3xl md:h-80 md:w-80" />
          </div>

          <div className="relative min-w-0">
            <div className="mb-6 grid min-w-0 gap-4 lg:grid-cols-[1fr_260px] lg:items-end">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 md:text-xs md:tracking-[0.45em]">
                  Customer Dashboard
                </p>

                <h1 className="mt-3 max-w-full break-words text-[2rem] font-black leading-[1.05] tracking-tight text-white md:mt-4 md:text-6xl">
                  Welcome, {profile.fullName || "Customer"}
                </h1>

                <p className="mt-3 max-w-2xl break-words text-base font-semibold leading-7 text-slate-400 md:mt-4 md:text-lg">
                  Discover curated premium restaurants and book instantly with
                  your exclusive Mvip benefits.
                </p>
              </div>

              <div className="w-full max-w-full rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.07] px-5 py-4 shadow-2xl shadow-amber-950/20">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                  Member Benefit
                </p>
                <p className="mt-2 text-4xl font-black leading-none text-white">
                  5% OFF
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  Direct customer discount
                </p>
              </div>
            </div>

            <div className="w-full max-w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/40 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl md:rounded-[1.7rem]">
              <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[1fr_120px_260px]">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  placeholder="Search restaurant, city or cuisine..."
                  className="h-14 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                />

                <button
                  type="button"
                  onClick={handleSearch}
                  className="h-14 w-full rounded-2xl bg-amber-300 px-5 text-base font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-200"
                >
                  Search
                </button>

                <select
                  value={cuisine}
                  onChange={(event) => {
                    setCuisine(event.target.value);
                    setVisibleCount(9);
                    setTimeout(hardLockViewport, 80);
                  }}
                  className="h-14 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-base font-semibold text-white outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                >
                  <option value="" className="text-slate-950">
                    All Cuisines
                  </option>

                  {cuisines.map((item) => (
                    <option key={item} value={item} className="text-slate-950">
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
                <div className="grid w-full min-w-0 grid-cols-3 gap-2 md:flex md:w-auto md:flex-wrap">
                  {(["top", "nearby", "popular"] as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        if (mode === "nearby") {
                          toggleNearby();
                          return;
                        }

                        setSortMode(mode);
                        setNearbyOnly(false);
                        setVisibleCount(9);
                      }}
                      className={
                        sortMode === mode
                          ? "min-w-0 rounded-xl bg-amber-300 px-2 py-3 text-[11px] font-black uppercase tracking-wide text-slate-950 md:px-5 md:text-xs"
                          : "min-w-0 rounded-xl border border-white/10 px-2 py-3 text-[11px] font-black uppercase tracking-wide text-slate-400 transition hover:bg-white/[0.08] hover:text-white md:px-5 md:text-xs"
                      }
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs font-black text-slate-400">
                  <span>
                    Showing {filteredRestaurants.length} of {restaurants.length}
                  </span>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-amber-300 transition hover:text-amber-200"
                  >
                    CLEAR FILTERS
                  </button>
                </div>
              </div>
            </div>

            {locationStatus && (
              <div className="mt-4 break-words rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
                {locationStatus}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto mt-8 w-full max-w-full overflow-x-hidden md:mt-10">
          <div className="flex min-w-0 flex-col justify-between gap-3 md:flex-row md:items-end">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300 md:tracking-[0.45em]">
                Curated Selection
              </p>

              <h2 className="mt-3 break-words text-3xl font-black leading-tight text-white md:text-4xl">
                Premium Restaurants
              </h2>

              <p className="mt-2 break-words text-sm text-slate-400">
                Browse luxury dining partners available for booking.
              </p>
            </div>

            <button
              type="button"
              onClick={requestLocation}
              className="hidden w-fit rounded-2xl border border-amber-300/40 px-5 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-300 hover:text-slate-950 md:block"
            >
              Find nearby restaurants
            </button>
          </div>

          {visibleRestaurants.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-10 text-center text-sm text-slate-300">
              No restaurants match your filters. Try clearing filters or explore
              top picks ✨
            </div>
          ) : (
            <div className="mt-6 grid w-full min-w-0 grid-cols-1 gap-5 overflow-hidden md:grid-cols-2 xl:grid-cols-3">
              {visibleRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}

          {visibleRestaurants.length < filteredRestaurants.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setVisibleCount((current) => current + 9);
                  setTimeout(hardLockViewport, 80);
                }}
                className="rounded-2xl border border-amber-300/40 px-6 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-300 hover:text-slate-950"
              >
                Load more restaurants
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}