'use client';

import Link from 'next/link';
import { memo, useMemo, useState } from 'react';
import { getRestaurantImageUrl } from '@/lib/restaurants/images';

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
};

type RestaurantWithDistance = Restaurant & {
  distance: number | null;
};

type Props = {
  profile: Profile;
  restaurants: Restaurant[];
};

type SortMode = 'top' | 'nearby' | 'popular';

function getCuisine(item: Restaurant) {
  return item.cuisine_type || item.category || 'Signature Dining';
}

function getImage(item: Restaurant) {
  return (
    getRestaurantImageUrl(item.cover_image) ||
    getRestaurantImageUrl(item.image_url) ||
    ''
  );
}

function getDiscount(item: Restaurant) {
  return Number(item.discount_percent ?? 5);
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

function formatDistance(distance: number | null) {
  if (distance === null) return 'Location unavailable';
  if (distance < 1) return `${Math.round(distance * 1000)}m away`;
  return `${distance.toFixed(1)}km away`;
}

const RestaurantCard = memo(function RestaurantCard({
  restaurant,
}: {
  restaurant: RestaurantWithDistance;
}) {
  const image = getImage(restaurant);
  const cuisine = getCuisine(restaurant);
  const discount = getDiscount(restaurant);
  const href = restaurant.slug
    ? `/restaurants/${restaurant.slug}`
    : `/restaurants/${restaurant.id}`;

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[2rem] border border-white/10 bg-[#11100c]/95 shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:border-amber-300/40"
    >
      <div className="relative h-64 overflow-hidden bg-[#12100b]">
        {image ? (
          <img
            src={image}
            alt={restaurant.name || 'Restaurant'}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#12100b] via-[#1c1407] to-[#3a2407] text-5xl">
            🍽️
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="absolute left-4 top-4 rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950 shadow-lg">
          🎉 {discount}% Member Benefit
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              {cuisine}
            </p>
            <h3 className="mt-2 line-clamp-2 text-2xl font-black text-white">
              {restaurant.name || 'Unnamed Restaurant'}
            </h3>
          </div>

          <span className="rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {formatDistance(restaurant.distance)}
          </span>
        </div>
      </div>

      <div className="p-5">
        <p className="line-clamp-2 text-sm leading-6 text-slate-400">
          {restaurant.short_description ||
            restaurant.description ||
            restaurant.address ||
            'Premium dining partner available for booking.'}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-300">
              📍 {restaurant.city || restaurant.address || 'Vietnam'}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {restaurant.price_range || 'Premium'}
            </p>
          </div>

          <span className="shrink-0 rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 transition group-hover:bg-amber-200">
            Book Now
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
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('top');
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(9);
  const [locationStatus, setLocationStatus] = useState('');
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  function handleSearch() {
    setQuery(input.trim());
    setVisibleCount(9);
  }

  function clearFilters() {
    setInput('');
    setQuery('');
    setCuisine('');
    setSortMode('top');
    setNearbyOnly(false);
    setVisibleCount(9);
    setLocationStatus('');
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('Your browser does not support location services.');
      return;
    }

    setLocationStatus('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setNearbyOnly(true);
        setSortMode('nearby');
        setVisibleCount(9);
        setLocationStatus('Nearby restaurants enabled.');
      },
      () => {
        setNearbyOnly(false);
        setLocationStatus(
          'We could not access your location. You can still browse all restaurants.',
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 7000,
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
    setSortMode((current) => (current === 'nearby' ? 'top' : 'nearby'));
    setVisibleCount(9);
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
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number';

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
    const keyword = query.toLowerCase();

    return restaurantsWithDistance
      .filter((item) => {
        const searchableText = [
          item.name,
          getCuisine(item),
          item.description,
          item.short_description,
          item.address,
          item.city,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchKeyword = !keyword || searchableText.includes(keyword);
        const matchCuisine = !cuisine || getCuisine(item) === cuisine;
        const matchNearby =
          !nearbyOnly ||
          !userLocation ||
          item.distance === null ||
          item.distance <= 10;

        return matchKeyword && matchCuisine && matchNearby;
      })
      .sort((a, b) => {
        if (sortMode === 'nearby') {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        }

        if (sortMode === 'popular') {
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
    <main className="relative min-h-screen overflow-hidden bg-[#050403] pb-24 text-white md:pb-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute right-0 top-40 h-[440px] w-[440px] rounded-full bg-orange-900/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(251,191,36,0.12)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <section className="relative overflow-hidden rounded-[2.4rem] border border-amber-300/15 bg-[#11100c]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.65)] md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="absolute -right-16 top-8 h-80 w-80 rounded-full bg-orange-700/10 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
          </div>

          <div className="relative">
            <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.45em] text-amber-300">
                  Customer Dashboard
                </p>

                <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">
                  Welcome, {profile.fullName || 'Customer'}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
                  Discover curated premium restaurants and book instantly with
                  your exclusive Mvip benefits.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.07] px-5 py-4 shadow-2xl shadow-amber-950/20">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">
                  Member Benefit
                </p>
                <p className="mt-2 text-3xl font-black text-white">5% OFF</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Direct customer discount
                </p>
              </div>
            </div>

            <div className="sticky top-[84px] z-30 rounded-[1.7rem] border border-white/10 bg-black/40 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl md:static">
              <div className="grid gap-3 lg:grid-cols-[1fr_120px_260px]">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSearch();
                  }}
                  placeholder="Search restaurant, city or cuisine..."
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                />

                <button
                  type="button"
                  onClick={handleSearch}
                  className="rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-200"
                >
                  Search
                </button>

                <select
                  value={cuisine}
                  onChange={(event) => {
                    setCuisine(event.target.value);
                    setVisibleCount(9);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-semibold text-white outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
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

              <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSortMode('top');
                      setNearbyOnly(false);
                      setVisibleCount(9);
                    }}
                    className={
                      sortMode === 'top'
                        ? 'rounded-xl bg-amber-300 px-5 py-3 text-xs font-black text-slate-950'
                        : 'rounded-xl border border-white/10 px-5 py-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.08] hover:text-white'
                    }
                  >
                    TOP
                  </button>

                  <button
                    type="button"
                    onClick={toggleNearby}
                    className={
                      sortMode === 'nearby'
                        ? 'rounded-xl bg-amber-300 px-5 py-3 text-xs font-black text-slate-950'
                        : 'rounded-xl border border-white/10 px-5 py-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.08] hover:text-white'
                    }
                  >
                    NEARBY
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSortMode('popular');
                      setNearbyOnly(false);
                      setVisibleCount(9);
                    }}
                    className={
                      sortMode === 'popular'
                        ? 'rounded-xl bg-amber-300 px-5 py-3 text-xs font-black text-slate-950'
                        : 'rounded-xl border border-white/10 px-5 py-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.08] hover:text-white'
                    }
                  >
                    POPULAR
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs font-black text-slate-400">
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
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
                {locationStatus}

                {!userLocation && (
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="ml-2 font-black text-amber-300 underline underline-offset-4"
                  >
                    Enable location
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-amber-300">
                Curated Selection
              </p>

              <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
                Premium Restaurants
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Browse luxury dining partners available for booking.
              </p>
            </div>

            <button
              type="button"
              onClick={requestLocation}
              className="w-fit rounded-2xl border border-amber-300/40 px-5 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-300 hover:text-slate-950"
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
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}

          {visibleRestaurants.length < filteredRestaurants.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + 9)}
                className="rounded-2xl border border-amber-300/40 px-6 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-300 hover:text-slate-950"
              >
                Load more restaurants
              </button>
            </div>
          )}
        </section>
      </div>

      <nav className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-around rounded-[1.5rem] border border-white/10 bg-black/80 px-3 py-3 shadow-2xl shadow-black/60 backdrop-blur-xl md:hidden">
        <Link href="/dashboard/customer" className="text-center text-xs font-black text-amber-300">
          <div className="text-lg">🏠</div>
          Home
        </Link>

        <Link href="/dashboard/customer/bookings" className="text-center text-xs font-black text-slate-400">
          <div className="text-lg">📅</div>
          Bookings
        </Link>

        <button
          type="button"
          onClick={requestLocation}
          className="text-center text-xs font-black text-slate-400"
        >
          <div className="text-lg">📍</div>
          Nearby
        </button>

        <Link href="/dashboard/customer/profile" className="text-center text-xs font-black text-slate-400">
          <div className="text-lg">👤</div>
          Profile
        </Link>
      </nav>
    </main>
  );
}