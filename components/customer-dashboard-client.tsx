"use client";

import Image from "next/image";
import Link from "next/link";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getRestaurantImageUrl } from "@/lib/restaurants/images";

type PreferredLanguage = "en" | "zh";

const CUSTOMER_COPY = {
  en: {
    dashboardLabel: "Customer Dashboard",
    welcome: "Welcome",
    customer: "Customer",
    description:
      "Discover curated premium restaurants and book instantly with your exclusive Mvip benefits.",
    memberBenefit: "Member Benefit",
    discountValue: "5% OFF",
    discountSuffix: "OFF",
    discountText: "Direct customer discount",
    searchPlaceholder: "Search restaurant, city or cuisine...",
    search: "Search",
    allCuisines: "All Cuisines",
    top: "top",
    nearby: "nearby",
    popular: "popular",
    showing: "Showing",
    of: "of",
    clearFilters: "CLEAR FILTERS",
    curatedSelection: "Curated Selection",
    premiumRestaurants: "Premium Restaurants",
    browseText: "Browse luxury dining partners available for booking.",
    findNearby: "Find nearby restaurants",
    noRestaurants:
      "No restaurants match your filters. Try clearing filters or explore top picks ✨",
    loadMore: "Load more restaurants",
    nearbyEnabled: "Nearby restaurants within 1km enabled.",
    detectingLocation: "Detecting your location...",
    locationNotSupported: "Your browser does not support location services.",
    locationDenied:
      "We could not access your location. You can still browse all restaurants.",
    luxuryDining: "Luxury Dining",
    signatureDining: "Signature Dining",
    premiumPartner: "Premium dining partner available for booking.",
    unnamedRestaurant: "Unnamed Restaurant",
    restaurantAlt: "Restaurant",
    vietnam: "Vietnam",
  },
  zh: {
    dashboardLabel: "客户中心",
    welcome: "欢迎",
    customer: "客户",
    description: "探索精选高端餐厅，并使用您的 Mvip 专属权益快速预订。",
    memberBenefit: "会员权益",
    discountValue: "5% 折扣",
    discountSuffix: "折扣",
    discountText: "顾客账单直接优惠",
    searchPlaceholder: "搜索餐厅、城市或菜系...",
    search: "搜索",
    allCuisines: "全部菜系",
    off: "折扣",
    top: "推荐",
    nearby: "附近",
    popular: "热门",
    showing: "显示",
    of: "共",
    clearFilters: "清除筛选",
    curatedSelection: "精选推荐",
    premiumRestaurants: "高端餐厅",
    browseText: "浏览可预订的高端餐饮合作伙伴。",
    findNearby: "查找附近餐厅",
    noRestaurants: "没有符合筛选条件的餐厅。请清除筛选或查看推荐餐厅 ✨",
    loadMore: "加载更多餐厅",
    nearbyEnabled: "已启用 1 公里内附近餐厅。",
    detectingLocation: "正在定位您的位置...",
    locationNotSupported: "您的浏览器不支持定位服务。",
    locationDenied: "无法获取您的位置。您仍然可以浏览所有餐厅。",
    luxuryDining: "高端餐饮",
    signatureDining: "特色餐饮",
    premiumPartner: "可预订的高端餐饮合作伙伴。",
    unnamedRestaurant: "未命名餐厅",
    restaurantAlt: "餐厅",
    vietnam: "越南",
  },
} satisfies Record<PreferredLanguage, Record<string, string>>;

type Profile = {
  fullName: string;
  email?: string;
  refCode?: string;
  preferredLanguage?: PreferredLanguage;
  preferred_language?: PreferredLanguage;
};

type Restaurant = {
  id: string;
  name?: string | null;
  name_zh?: string | null;
  slug?: string | null;
  address?: string | null;
  address_zh?: string | null;
  city?: string | null;
  city_zh?: string | null;
  district?: string | null;
  country?: string | null;
  cuisine_type?: string | null;
  cuisine_type_zh?: string | null;
  category?: string | null;
  category_zh?: string | null;
  description?: string | null;
  description_zh?: string | null;
  short_description?: string | null;
  short_description_zh?: string | null;
  // Các cột ảnh theo schema thực tế
  cover_image?: string | null;
  cover_image_url?: string | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price_range?: string | null;
  price_from?: number | null;
  discount_percent?: number | null;
  customer_discount_percent?: number | null;
  is_featured?: boolean | null;
  is_top_30_for_foreign_guests?: boolean | null;
  has_rooftop?: boolean | null;
  has_buffet?: boolean | null;
  has_fine_dining?: boolean | null;
  tier?: string | null;
  booking_priority_score?: number | null;
  tags?: string[] | null;
  category_tags?: string[] | null;
  average_rating?: number | null;
  total_reviews?: number | null;
};

type RestaurantWithDistance = Restaurant & {
  distance: number | null;
};

type Props = {
  profile: Profile;
  restaurants: Restaurant[];
  preferredLanguage?: PreferredLanguage;
};

type SortMode = "top" | "nearby" | "popular";

const INITIAL_VISIBLE_COUNT = 9;
const LOAD_MORE_COUNT = 9;
const NEARBY_RADIUS_KM = 1;

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

function cleanText(value?: string | null) {
  const text = String(value || "").trim();
  return text || "";
}

function pickText(
  language: PreferredLanguage,
  zh?: string | null,
  fallback?: string | null,
  defaultValue: string = "",
): string {
  if (language === "zh" && cleanText(zh)) return cleanText(zh);
  if (cleanText(fallback)) return cleanText(fallback);
  return defaultValue;
}

function getLanguageFromProfile(profile: Profile): PreferredLanguage {
  return profile.preferredLanguage === "zh" || profile.preferred_language === "zh"
    ? "zh"
    : "en";
}

function getCuisine(
  item: Restaurant,
  language: PreferredLanguage = "en",
  fallback = CUSTOMER_COPY.en.signatureDining,
) {
  return pickText(
    language,
    item.cuisine_type_zh || item.category_zh,
    item.cuisine_type || item.category,
    fallback,
  );
}

function getRestaurantName(
  item: Restaurant,
  language: PreferredLanguage,
  fallback: string,
) {
  return pickText(language, item.name_zh, item.name, fallback);
}

function getRestaurantDescription(
  item: Restaurant,
  language: PreferredLanguage,
  fallback: string,
) {
  return pickText(
    language,
    item.short_description_zh || item.description_zh,
    item.short_description || item.description || item.address,
    fallback,
  );
}

function getRestaurantCity(
  item: Restaurant,
  language: PreferredLanguage,
  fallback: string,
) {
  return pickText(language, item.city_zh, item.city, fallback);
}

function getSearchableText(item: Restaurant, language: PreferredLanguage) {
  return [
    item.name,
    item.name_zh,
    getCuisine(item, language),
    item.cuisine_type,
    item.cuisine_type_zh,
    item.category,
    item.category_zh,
    item.description,
    item.description_zh,
    item.short_description,
    item.short_description_zh,
    item.address,
    item.address_zh,
    item.city,
    item.city_zh,
    "restaurant",
    "restaurants",
    "nha hang",
    "nhà hàng",
    "餐厅",
    "美食",
  ]
    .filter(Boolean)
    .join(" ");
}

function getImage(item: Restaurant) {
  // Thử tất cả cột ảnh theo thứ tự ưu tiên — đúng với schema thực tế
  return (
    getRestaurantImageUrl(item.cover_image) ||
    getRestaurantImageUrl(item.cover_image_url) ||
    getRestaurantImageUrl(item.image_url) ||
    ""
  );
}

function getDiscount(item: Restaurant) {
  // Ưu tiên customer_discount_percent (cột mới) rồi mới đến discount_percent
  return Number(item.customer_discount_percent ?? item.discount_percent ?? 5);
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

// FIX #2: Thay <img> thuần bằng Next.js <Image> để có:
// - Tự động resize ảnh theo viewport (sizes prop)
// - Tự động chọn AVIF/WebP (đã config trong next.config.js)
// - Blur placeholder khi ảnh đang load
// - Lazy load thông minh hơn browser native
const RestaurantCard = memo(function RestaurantCard({
  restaurant,
  language,
}: {
  restaurant: RestaurantWithDistance;
  language: PreferredLanguage;
}) {
  const t = CUSTOMER_COPY[language];
  const image = getImage(restaurant);
  const [imgError, setImgError] = useState(false);
  const cuisine = getCuisine(restaurant, language, t.signatureDining);
  const discount = getDiscount(restaurant);
  const rating = getAverageRating(restaurant);
  const restaurantName = getRestaurantName(
    restaurant,
    language,
    t.unnamedRestaurant,
  );
  const description = getRestaurantDescription(
    restaurant,
    language,
    t.premiumPartner,
  );
  const city = getRestaurantCity(restaurant, language, t.vietnam);

  const href = restaurant.slug
    ? `/restaurants/${restaurant.slug}`
    : `/restaurants/${restaurant.id}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className="group block w-full max-w-full overflow-hidden rounded-3xl border border-white/10 bg-[#11100c]/95 shadow-xl shadow-black/25 transition hover:border-amber-300/40"
    >
      {/* FIX #2: Next.js <Image> với fill + sizes thay vì <img src> */}
      <div className="relative h-44 w-full overflow-hidden bg-[#12100b] sm:h-56">
        {image && !imgError ? (
          <Image
            src={image}
            alt={restaurantName || t.restaurantAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            quality={75}
            loading="lazy"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#12100b] via-[#1c1407] to-[#3a2407] text-5xl">
            🍽️
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        <div className="absolute left-3 top-3 rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black text-slate-950 shadow-lg">
          {discount}% {t.discountSuffix}
        </div>

        <div className="absolute bottom-4 left-4 right-4 min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
            {cuisine}
          </p>

          <h3 className="mt-2 line-clamp-2 break-words text-xl font-black leading-tight text-white">
            {restaurantName}
          </h3>
        </div>
      </div>

      <div className="w-full max-w-full overflow-hidden p-4">
        <p className="line-clamp-2 break-words text-sm leading-6 text-slate-400">
          {description}
        </p>

        <div className="mt-5 flex w-full max-w-full items-center justify-between gap-3 overflow-hidden">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-300">
            📍 {city}
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
  preferredLanguage,
}: Props) {
  const language = preferredLanguage || getLanguageFromProfile(profile);
  const t = CUSTOMER_COPY[language];
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [cuisine, setCuisine] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("top");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [locationStatus, setLocationStatus] = useState("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    hardLockViewport();
  }, [deferredQuery, cuisine, sortMode, nearbyOnly, visibleCount]);

  const resetVisibleCount = useCallback(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, []);

  const handleSearch = useCallback(() => {
    inputRef.current?.blur();
    setQuery(input.trim());
    resetVisibleCount();
    setTimeout(hardLockViewport, 80);
  }, [input, resetVisibleCount]);

  const clearFilters = useCallback(() => {
    inputRef.current?.blur();
    setInput("");
    setQuery("");
    setCuisine("");
    setSortMode("top");
    setNearbyOnly(false);
    resetVisibleCount();
    setLocationStatus("");
    setTimeout(hardLockViewport, 80);
  }, [resetVisibleCount]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus(t.locationNotSupported);
      return;
    }

    setLocationStatus(t.detectingLocation);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        setNearbyOnly(true);
        setSortMode("nearby");
        resetVisibleCount();
        setLocationStatus(t.nearbyEnabled);
        setTimeout(hardLockViewport, 80);
      },
      () => {
        setNearbyOnly(false);
        setLocationStatus(t.locationDenied);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000 * 60 * 5,
      },
    );
  }, [
    resetVisibleCount,
    t.detectingLocation,
    t.locationDenied,
    t.locationNotSupported,
    t.nearbyEnabled,
  ]);

  const toggleNearby = useCallback(() => {
    if (!nearbyOnly && !userLocation) {
      requestLocation();
      return;
    }

    setNearbyOnly((current) => !current);
    setSortMode((current) => (current === "nearby" ? "top" : "nearby"));
    resetVisibleCount();
    setTimeout(hardLockViewport, 80);
  }, [nearbyOnly, requestLocation, resetVisibleCount, userLocation]);

  const cuisines = useMemo(() => {
    return Array.from(
      new Set(
        restaurants.map((item) => getCuisine(item, language, t.signatureDining)),
      ),
    )
      .filter(Boolean)
      .sort();
  }, [restaurants, language, t.signatureDining]);

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

  const searchableRestaurantMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of restaurantsWithDistance) {
      map.set(item.id, normalizeSearch(getSearchableText(item, language)));
    }

    return map;
  }, [restaurantsWithDistance, language]);

  const filteredRestaurants = useMemo<RestaurantWithDistance[]>(() => {
    const keyword = normalizeSearch(deferredQuery);

    return restaurantsWithDistance
      .filter((item) => {
        const searchableText = searchableRestaurantMap.get(item.id) || "";

        const matchKeyword = !keyword || searchableText.includes(keyword);
        const matchCuisine =
          !cuisine || getCuisine(item, language, t.signatureDining) === cuisine;

        const matchNearby =
          !nearbyOnly ||
          !userLocation ||
          (item.distance !== null && item.distance <= NEARBY_RADIUS_KM);

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
            (a.short_description || a.short_description_zh ? 10 : 0) +
            (a.city || a.city_zh ? 8 : 0);

          const bScore =
            (b.cover_image || b.image_url ? 20 : 0) +
            (b.short_description || b.short_description_zh ? 10 : 0) +
            (b.city || b.city_zh ? 8 : 0);

          return bScore - aScore;
        }

        const aScore =
          (a.cover_image || a.image_url ? 50 : 0) +
          (a.name || a.name_zh ? 10 : 0) +
          (a.short_description || a.short_description_zh ? 10 : 0);

        const bScore =
          (b.cover_image || b.image_url ? 50 : 0) +
          (b.name || b.name_zh ? 10 : 0) +
          (b.short_description || b.short_description_zh ? 10 : 0);

        return bScore - aScore;
      });
  }, [
    restaurantsWithDistance,
    searchableRestaurantMap,
    deferredQuery,
    cuisine,
    sortMode,
    nearbyOnly,
    userLocation,
    language,
    t.signatureDining,
  ]);

  const visibleRestaurants = useMemo(() => {
    return filteredRestaurants.slice(0, visibleCount);
  }, [filteredRestaurants, visibleCount]);

  return (
    <main className="mobile-viewport-lock relative min-h-screen bg-[#050403] pb-10 text-white">
      <div className="pointer-events-none absolute inset-0 w-full max-w-full overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl md:h-[560px] md:w-[560px]" />
        <div className="absolute right-0 top-40 h-[180px] w-[180px] rounded-full bg-orange-900/20 blur-3xl md:h-[440px] md:w-[440px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(251,191,36,0.12)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl overflow-x-hidden px-3 py-5 sm:px-4 md:px-6 md:py-8">
        <section className="mobile-safe-card relative mx-auto rounded-[1.35rem] border border-amber-300/15 bg-[#11100c]/95 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.55)] md:rounded-[2.4rem] md:p-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-24 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl md:h-72 md:w-72" />
            <div className="absolute right-0 top-8 h-52 w-52 rounded-full bg-orange-700/10 blur-3xl md:h-80 md:w-80" />
          </div>

          <div className="relative min-w-0">
            <div className="mb-6 grid min-w-0 gap-4 lg:grid-cols-[1fr_260px] lg:items-end">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 md:text-xs md:tracking-[0.45em]">
                  {t.dashboardLabel}
                </p>

                <h1 className="mobile-safe-text mt-3 text-[2rem] font-black leading-[1.05] tracking-tight text-white md:mt-4 md:text-6xl">
                  {t.welcome}, {profile.fullName || t.customer}
                </h1>

                <p className="mobile-safe-text mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-400 md:mt-4 md:text-lg">
                  {t.description}
                </p>
              </div>

              <div className="mobile-safe-card rounded-[1.35rem] border border-amber-300/20 bg-amber-300/[0.07] px-5 py-4 shadow-2xl shadow-amber-950/20 md:rounded-[1.5rem]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                  {t.memberBenefit}
                </p>
                <p className="mt-2 text-4xl font-black leading-none text-white">
                  {t.discountValue}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  {t.discountText}
                </p>
              </div>
            </div>

            <div className="mobile-safe-card rounded-[1.35rem] border border-white/10 bg-black/40 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl md:rounded-[1.7rem]">
              <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[1fr_120px_260px]">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  placeholder={t.searchPlaceholder}
                  className="h-14 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                />

                <button
                  type="button"
                  onClick={handleSearch}
                  className="h-14 w-full rounded-2xl bg-amber-300 px-5 text-base font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-200"
                >
                  {t.search}
                </button>

                <select
                  value={cuisine}
                  onChange={(event) => {
                    setCuisine(event.target.value);
                    resetVisibleCount();
                    setTimeout(hardLockViewport, 80);
                  }}
                  className="h-14 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-base font-semibold text-white outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                >
                  <option value="" className="text-slate-950">
                    {t.allCuisines}
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
                        resetVisibleCount();
                      }}
                      className={
                        sortMode === mode
                          ? "min-w-0 rounded-xl bg-amber-300 px-2 py-3 text-[11px] font-black uppercase tracking-wide text-slate-950 md:px-5 md:text-xs"
                          : "min-w-0 rounded-xl border border-white/10 px-2 py-3 text-[11px] font-black uppercase tracking-wide text-slate-400 transition hover:bg-white/[0.08] hover:text-white md:px-5 md:text-xs"
                      }
                    >
                      {t[mode]}
                    </button>
                  ))}
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs font-black text-slate-400">
                  <span>
                    {t.showing} {filteredRestaurants.length} {t.of}{" "}
                    {restaurants.length}
                  </span>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-amber-300 transition hover:text-amber-200"
                  >
                    {t.clearFilters}
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
                {t.curatedSelection}
              </p>

              <h2 className="mobile-safe-text mt-3 text-3xl font-black leading-tight text-white md:text-4xl">
                {t.premiumRestaurants}
              </h2>

              <p className="mobile-safe-text mt-2 text-sm text-slate-400">
                {t.browseText}
              </p>
            </div>

            <button
              type="button"
              onClick={requestLocation}
              className="hidden w-fit rounded-2xl border border-amber-300/40 px-5 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-300 hover:text-slate-950 md:block"
            >
              {t.findNearby}
            </button>
          </div>

          {visibleRestaurants.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-10 text-center text-sm text-slate-300">
              {t.noRestaurants}
            </div>
          ) : (
            <div className="mt-6 grid w-full min-w-0 grid-cols-1 gap-5 overflow-hidden md:grid-cols-2 xl:grid-cols-3">
              {visibleRestaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  language={language}
                />
              ))}
            </div>
          )}

          {visibleRestaurants.length < filteredRestaurants.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setVisibleCount((current) => current + LOAD_MORE_COUNT);
                  setTimeout(hardLockViewport, 80);
                }}
                className="rounded-2xl border border-amber-300/40 px-6 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-300 hover:text-slate-950"
              >
                {t.loadMore}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
