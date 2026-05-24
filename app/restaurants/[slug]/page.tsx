import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPublicRestaurantDetail } from "@/lib/restaurants/get-public-restaurant-detail";

const RestaurantGallery = dynamic(
  () => import("@/components/restaurants/restaurant-gallery"),
  {
    loading: () => (
      <div className="h-[235px] w-full rounded-[28px] border border-white/10 bg-white/[0.06] sm:h-[320px] md:h-[500px]" />
    ),
  },
);

const RestaurantInfoTabs = dynamic(
  () => import("@/components/restaurants/restaurant-info-tabs"),
  {
    loading: () => (
      <div className="h-[360px] w-full rounded-[28px] border border-white/10 bg-white/[0.06]" />
    ),
  },
);

const RestaurantBookingForm = dynamic(
  () => import("@/components/restaurants/restaurant-booking-form"),
  {
    loading: () => (
      <div className="h-[620px] w-full rounded-[34px] border border-white/10 bg-white/[0.06]" />
    ),
  },
);

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type PreferredLanguage = "en" | "zh";

const DETAIL_COPY = {
  en: {
    previewMode:
      "Preview Mode — this restaurant is currently inactive and only visible to owner/admin.",
    luxuryDiningPartner: "Luxury Dining Partner",
    reviews: "Reviews",
    exclusiveOffer: "Exclusive Offer",
    instantCustomerDiscount: "Instant customer discount",
    supplierPreview: "Supplier Preview",
    bookingDisabled: "Booking Disabled",
    inactiveMessage:
      "This restaurant is inactive. Customers cannot book until Admin approves and activates it.",
    bookNow: "Book Now",
    restaurantFallback: "Restaurant",
  },
  zh: {
    previewMode: "预览模式 — 此餐厅当前未启用，仅供应商/管理员可见。",
    luxuryDiningPartner: "高端餐饮合作伙伴",
    reviews: "评价",
    exclusiveOffer: "专属优惠",
    instantCustomerDiscount: "客户即时折扣",
    supplierPreview: "供应商预览",
    bookingDisabled: "暂不可预订",
    inactiveMessage: "此餐厅当前未启用。管理员审核并启用后，客户才可以预订。",
    bookNow: "立即预订",
    restaurantFallback: "餐厅",
  },
} as const;

function getLocalizedValue(
  restaurant: Record<string, unknown>,
  language: PreferredLanguage,
  enKey: string,
  zhKey: string,
) {
  const zhValue = restaurant[zhKey];
  const enValue = restaurant[enKey];

  if (language === "zh" && typeof zhValue === "string" && zhValue.trim()) {
    return zhValue;
  }

  if (typeof enValue === "string" && enValue.trim()) {
    return enValue;
  }

  return null;
}

async function getPreferredLanguage(): Promise<PreferredLanguage> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return "en";

    const { data: profile } = await adminClient
      .from("profiles")
      .select("preferred_language")
      .eq("id", user.id)
      .maybeSingle();

    return profile?.preferred_language === "zh" ? "zh" : "en";
  } catch (error) {
    console.error("GET_RESTAURANT_DETAIL_LANGUAGE_ERROR:", error);
    return "en";
  }
}

export default async function RestaurantDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const [restaurant, preferredLanguage] = await Promise.all([
    getPublicRestaurantDetail(slug),
    getPreferredLanguage(),
  ]);

  if (!restaurant) notFound();

  const language = preferredLanguage === "zh" ? "zh" : "en";
  const t = DETAIL_COPY[language];
  const restaurantRecord = restaurant as Record<string, unknown>;

  const restaurantName =
    getLocalizedValue(restaurantRecord, language, "name", "name_zh") ||
    t.restaurantFallback;

  const shortDescription = getLocalizedValue(
    restaurantRecord,
    language,
    "short_description",
    "short_description_zh",
  );

  const fullDescription = getLocalizedValue(
    restaurantRecord,
    language,
    "full_description",
    "full_description_zh",
  );

  const address = getLocalizedValue(
    restaurantRecord,
    language,
    "address",
    "address_zh",
  );

  const city = getLocalizedValue(restaurantRecord, language, "city", "city_zh");

  const tags =
    language === "zh" && Array.isArray(restaurantRecord.tags_zh)
      ? (restaurantRecord.tags_zh as string[])
      : ((restaurantRecord.tags as string[] | null) || []);

  const amenities =
    language === "zh" && Array.isArray(restaurantRecord.amenities_zh)
      ? (restaurantRecord.amenities_zh as string[])
      : ((restaurantRecord.amenities as string[] | null) || []);

  const openingHours =
    language === "zh" && restaurantRecord.opening_hours_zh
      ? (restaurantRecord.opening_hours_zh as Record<string, string>)
      : (restaurantRecord.opening_hours as Record<string, string> | null);

  const priceRange = getLocalizedValue(
    restaurantRecord,
    language,
    "price_range",
    "price_range_zh",
  );

  const coverImage =
    typeof restaurantRecord.cover_image === "string"
      ? restaurantRecord.cover_image
      : null;

  const galleryImages = Array.isArray(restaurantRecord.gallery_images)
    ? (restaurantRecord.gallery_images as string[])
    : [];

  const menuImages = Array.isArray(restaurantRecord.menu_images)
    ? (restaurantRecord.menu_images as string[])
    : [];

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
            {t.previewMode}
          </div>
        )}

        <section className="relative mb-5 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/35 backdrop-blur-2xl md:rounded-[34px] md:p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/10 via-transparent to-orange-800/20" />

          <div className="relative grid min-w-0 gap-3 md:grid-cols-[1fr_220px] md:items-center lg:grid-cols-[1fr_260px]">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300 md:text-xs md:tracking-[0.28em]">
                {t.luxuryDiningPartner}
              </p>

              <h1 className="mt-3 max-w-full break-words text-[2.55rem] font-black leading-[1] tracking-tight text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.7)] md:text-5xl lg:text-6xl">
                {restaurantName}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100">
                  ★ {t.reviews}
                </div>

                {city && (
                  <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-slate-300">
                    📍 {city}
                  </div>
                )}
              </div>
            </div>

            <div className="-mt-1 max-w-full rounded-[18px] border border-amber-300/20 bg-gradient-to-br from-amber-300/16 to-yellow-700/10 px-4 py-3 text-center shadow-xl shadow-amber-900/10 backdrop-blur-xl md:mt-0 md:rounded-[22px] md:px-5 md:py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-200 md:text-[10px]">
                {t.exclusiveOffer}
              </p>

              <p className="mt-1 text-3xl font-black leading-none text-amber-300 md:text-4xl">
                -5%
              </p>

              <p className="mt-1 text-[11px] font-bold leading-5 text-slate-300 md:text-xs">
                {t.instantCustomerDiscount}
              </p>
            </div>
          </div>
        </section>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 space-y-5">
            <RestaurantGallery
              name={restaurantName}
              coverImage={coverImage}
              galleryImages={galleryImages}
            />

            <RestaurantInfoTabs
              restaurantId={String(restaurantRecord.id)}
              slug={String(restaurantRecord.slug)}
              shortDescription={shortDescription}
              fullDescription={fullDescription}
              openingHours={openingHours}
              address={address}
              city={city}
              latitude={
                typeof restaurantRecord.latitude === "number"
                  ? restaurantRecord.latitude
                  : null
              }
              longitude={
                typeof restaurantRecord.longitude === "number"
                  ? restaurantRecord.longitude
                  : null
              }
              tags={tags}
              amenities={amenities}
              priceRange={priceRange}
              menuImages={menuImages}
              preferredLanguage={language}
            />
          </div>

          <div id="booking-form" className="min-w-0 scroll-mt-28">
            {restaurant.is_active ? (
              <RestaurantBookingForm
                restaurantId={String(restaurantRecord.id)}
                restaurantName={restaurantName}
                supplierId={
                  typeof restaurantRecord.supplier_id === "string"
                    ? restaurantRecord.supplier_id
                    : null
                }
                preferredLanguage={language}
              />
            ) : (
              <aside className="self-start rounded-[30px] border border-amber-300/20 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur-2xl lg:sticky lg:top-28">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">
                  {t.supplierPreview}
                </p>

                <h2 className="mt-3 text-2xl font-black text-white">
                  {t.bookingDisabled}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {t.inactiveMessage}
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
            {t.bookNow}
          </a>
        </div>
      )}
    </main>
  );
}