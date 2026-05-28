import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getPublicRestaurantDetail } from "@/lib/restaurants/get-public-restaurant-detail";
import { adminClient } from "@/lib/supabase/admin";

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
  params: Promise<{ slug: string }>;
};

// ISR: Cache trang trên Vercel CDN 1 giờ.
// Khi supplier update restaurant → gọi /api/revalidate?slug=xxx để rebuild ngay.
// 2000 users xem 10 nhà hàng phổ biến = 20,000 renders/giờ → gần 0 với ISR.
export const revalidate = 3600;

// Pre-render các nhà hàng phổ biến lúc build time
export async function generateStaticParams() {
  const { data } = await adminClient
    .from("restaurants")
    .select("slug")
    .eq("is_active", true)
    .order("booking_priority_score", { ascending: false, nullsFirst: false })
    .limit(30);

  return (data || [])
    .filter((r) => r.slug)
    .map((r) => ({ slug: r.slug as string }));
}

// OPTION 2 — Bilingual copy: ISR cache trang với cả 2 ngôn ngữ.
// Client components tự đọc cookie mvip_lang để chọn ngôn ngữ đúng.
// Không cần cookies() trên server → không phá ISR.
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

export default async function RestaurantDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const restaurant = await getPublicRestaurantDetail(slug);

  if (!restaurant) notFound();

  const restaurantRecord = restaurant as Record<string, unknown>;

  // Truyền cả 2 ngôn ngữ xuống client — không đọc cookie trên server.
  // Client components sẽ chọn đúng ngôn ngữ dựa trên cookie mvip_lang.
  const nameEn =
    typeof restaurantRecord.name === "string" && restaurantRecord.name.trim()
      ? restaurantRecord.name
      : DETAIL_COPY.en.restaurantFallback;

  const nameZh =
    typeof restaurantRecord.name_zh === "string" &&
    restaurantRecord.name_zh.trim()
      ? restaurantRecord.name_zh
      : nameEn;

  const galleryImages = Array.isArray(restaurantRecord.gallery_images)
    ? (restaurantRecord.gallery_images as string[])
    : [];

  const menuImages = Array.isArray(restaurantRecord.menu_images)
    ? (restaurantRecord.menu_images as string[])
    : [];

  const coverImage =
    typeof restaurantRecord.cover_image === "string"
      ? restaurantRecord.cover_image
      : typeof restaurantRecord.cover_image_url === "string"
        ? restaurantRecord.cover_image_url
        : null;

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
          // Banner preview — không cần i18n vì chỉ admin/supplier thấy
          <div className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
            {DETAIL_COPY.en.previewMode}
          </div>
        )}

        {/* RestaurantPageHeader: client component tự chọn ngôn ngữ */}
        <RestaurantPageHeader
          nameEn={nameEn}
          nameZh={nameZh}
          isActive={Boolean(restaurant.is_active)}
        />

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 space-y-5">
            <RestaurantGallery
              // Tên gallery không phụ thuộc language — dùng en làm fallback
              name={nameEn}
              coverImage={coverImage}
              galleryImages={galleryImages}
            />

            <RestaurantInfoTabs
              restaurantId={String(restaurantRecord.id)}
              slug={String(restaurantRecord.slug)}
              // Truyền cả 2 ngôn ngữ — component tự chọn
              shortDescriptionEn={
                typeof restaurantRecord.short_description === "string"
                  ? restaurantRecord.short_description
                  : null
              }
              shortDescriptionZh={
                typeof restaurantRecord.short_description_zh === "string"
                  ? restaurantRecord.short_description_zh
                  : null
              }
              fullDescriptionEn={
                typeof restaurantRecord.full_description === "string"
                  ? restaurantRecord.full_description
                  : null
              }
              fullDescriptionZh={
                typeof restaurantRecord.full_description_zh === "string"
                  ? restaurantRecord.full_description_zh
                  : null
              }
              openingHoursEn={
                restaurantRecord.opening_hours as Record<
                  string,
                  string
                > | null
              }
              openingHoursZh={
                restaurantRecord.opening_hours_zh as Record<
                  string,
                  string
                > | null
              }
              addressEn={
                typeof restaurantRecord.address === "string"
                  ? restaurantRecord.address
                  : null
              }
              addressZh={
                typeof restaurantRecord.address_zh === "string"
                  ? restaurantRecord.address_zh
                  : null
              }
              cityEn={
                typeof restaurantRecord.city === "string"
                  ? restaurantRecord.city
                  : null
              }
              cityZh={
                typeof restaurantRecord.city_zh === "string"
                  ? restaurantRecord.city_zh
                  : null
              }
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
              tagsEn={
                Array.isArray(restaurantRecord.tags)
                  ? (restaurantRecord.tags as string[])
                  : []
              }
              tagsZh={
                Array.isArray(restaurantRecord.tags_zh)
                  ? (restaurantRecord.tags_zh as string[])
                  : []
              }
              amenitiesEn={
                Array.isArray(restaurantRecord.amenities)
                  ? (restaurantRecord.amenities as string[])
                  : []
              }
              amenitiesZh={
                Array.isArray(restaurantRecord.amenities_zh)
                  ? (restaurantRecord.amenities_zh as string[])
                  : []
              }
              priceRangeEn={
                typeof restaurantRecord.price_range === "string"
                  ? restaurantRecord.price_range
                  : null
              }
              priceRangeZh={
                typeof restaurantRecord.price_range_zh === "string"
                  ? restaurantRecord.price_range_zh
                  : null
              }
              menuImages={menuImages}
            />
          </div>

          <div id="booking-form" className="min-w-0 scroll-mt-28">
            {restaurant.is_active ? (
              <RestaurantBookingForm
                restaurantId={String(restaurantRecord.id)}
                restaurantNameEn={nameEn}
                restaurantNameZh={nameZh}
                supplierId={
                  typeof restaurantRecord.supplier_id === "string"
                    ? restaurantRecord.supplier_id
                    : null
                }
              />
            ) : (
              // Inactive state — chỉ admin/supplier thấy, dùng en
              <aside className="self-start rounded-[30px] border border-amber-300/20 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur-2xl lg:sticky lg:top-28">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">
                  {DETAIL_COPY.en.supplierPreview}
                </p>
                <h2 className="mt-3 text-2xl font-black text-white">
                  {DETAIL_COPY.en.bookingDisabled}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {DETAIL_COPY.en.inactiveMessage}
                </p>
              </aside>
            )}
          </div>
        </div>
      </section>

      {restaurant.is_active && (
        <RestaurantBookNowBar />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// RestaurantPageHeader — client component, tự đọc cookie để chọn ngôn ngữ
// ---------------------------------------------------------------------------
// Đặt ở cuối file để tránh tạo thêm file mới.
// Nếu project lớn hơn, tách ra components/restaurants/restaurant-page-header.tsx

import RestaurantPageHeader from "@/components/restaurants/restaurant-page-header";
import RestaurantBookNowBar from "@/components/restaurants/restaurant-book-now-bar";
