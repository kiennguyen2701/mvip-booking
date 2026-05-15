"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getRestaurantImageUrl } from "@/lib/restaurants/images";
import {
  createRestaurantReview,
  type ReviewActionState,
} from "@/app/actions/restaurant-reviews";

type RestaurantReview = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

type Props = {
  restaurantId: string;
  slug: string;

  shortDescription?: string | null;
  fullDescription?: string | null;
  openingHours?: Record<string, string> | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tags?: string[] | null;
  amenities?: string[] | null;
  priceRange?: string | null;
  menuImages?: string[] | null;

  initialReviews: RestaurantReview[];
  totalReviews: number;
  averageRating: number;
  canReview: boolean;
  completedBookingId: string | null;
  alreadyReviewed: boolean;
};

const tabs = [
  { key: "about", label: "Introduction" },
  { key: "hours", label: "Opening Hours" },
  { key: "location", label: "Location" },
  { key: "food", label: "Food Type" },
  { key: "menu", label: "Menu" },
  { key: "reviews", label: "Reviews" },
] as const;

const dayOrder = [
  { keys: ["monday", "mon", "Monday", "Mon"], label: "Monday" },
  { keys: ["tuesday", "tue", "Tuesday", "Tue"], label: "Tuesday" },
  { keys: ["wednesday", "wed", "Wednesday", "Wed"], label: "Wednesday" },
  { keys: ["thursday", "thu", "Thursday", "Thu"], label: "Thursday" },
  { keys: ["friday", "fri", "Friday", "Fri"], label: "Friday" },
  { keys: ["saturday", "sat", "Saturday", "Sat"], label: "Saturday" },
  { keys: ["sunday", "sun", "Sunday", "Sun"], label: "Sunday" },
];

type TabKey = (typeof tabs)[number]["key"];

const initialReviewState: ReviewActionState = {
  success: false,
  message: "",
};

function Stars({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;

        if (readonly) {
          return (
            <span
              key={star}
              className={active ? "text-amber-300" : "text-slate-700"}
            >
              ★
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className={
              active
                ? "text-2xl text-amber-300 transition hover:scale-110"
                : "text-2xl text-slate-700 transition hover:scale-110 hover:text-amber-200"
            }
            aria-label={`${star} stars`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function RestaurantInfoTabs({
  restaurantId,
  slug,
  shortDescription,
  fullDescription,
  openingHours,
  address,
  city,
  latitude,
  longitude,
  tags,
  amenities,
  priceRange,
  menuImages,
  initialReviews,
  totalReviews,
  averageRating,
  canReview,
  completedBookingId,
  alreadyReviewed,
}: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const [reviews, setReviews] = useState<RestaurantReview[]>(initialReviews);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewState, setReviewState] =
    useState<ReviewActionState>(initialReviewState);
  const [isPending, startTransition] = useTransition();

  const hours = useMemo(() => {
    if (!openingHours) return [];

    return dayOrder
      .map((day) => {
        const value = day.keys
          .map((key) => openingHours[key])
          .find((item) => Boolean(item));

        return {
          label: day.label,
          value,
        };
      })
      .filter((item) => Boolean(item.value));
  }, [openingHours]);

  const visibleMenuImages = useMemo(() => {
    return (menuImages || [])
      .map((image) => getRestaurantImageUrl(image) || image)
      .filter(Boolean);
  }, [menuImages]);

  const hasMap =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const hasMoreReviews = reviews.length < totalReviews;

  async function loadMoreReviews() {
    if (loadingMore || !hasMoreReviews) return;

    setLoadingMore(true);

    try {
      const response = await fetch(
        `/api/restaurants/${restaurantId}/reviews?offset=${reviews.length}&limit=10`,
        {
          cache: "no-store",
        },
      );

      const data = (await response.json()) as {
        reviews?: RestaurantReview[];
      };

      setReviews((current) => [...current, ...(data.reviews || [])]);
    } catch (error) {
      console.error("LOAD_MORE_REVIEWS_ERROR:", error);
    } finally {
      setLoadingMore(false);
    }
  }

  function submitReview(formData: FormData) {
    setReviewState(initialReviewState);

    startTransition(async () => {
      const result = await createRestaurantReview(initialReviewState, formData);

      setReviewState(result);

      if (result.success) {
        setComment("");
        setRating(5);
        router.refresh();
      }
    });
  }

  return (
    <section className="w-full max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-3 shadow-2xl shadow-black/25 backdrop-blur-2xl md:rounded-[36px] md:p-6">
      <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                active
                  ? "shrink-0 whitespace-nowrap rounded-xl bg-amber-300 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-950"
                  : "shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 max-w-full overflow-hidden">
        {activeTab === "about" && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              About Restaurant
            </p>

            <p className="mt-4 break-words text-sm font-semibold leading-7 text-slate-300">
              {shortDescription || "Restaurant introduction is being updated."}
            </p>

            {fullDescription && (
              <div
                className="mt-5 break-words text-sm leading-7 text-slate-300"
                dangerouslySetInnerHTML={{ __html: fullDescription }}
              />
            )}
          </div>
        )}

        {activeTab === "hours" && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Opening Hours
            </p>

            {hours.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {hours.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm"
                  >
                    <span className="font-black text-white">{item.label}</span>
                    <span className="text-right font-semibold text-slate-300">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm font-semibold text-slate-400">
                Opening hours are being updated.
              </p>
            )}
          </div>
        )}

        {activeTab === "location" && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Location
            </p>

            <p className="mt-4 break-words text-sm font-semibold leading-7 text-slate-300">
              {[address, city].filter(Boolean).join(", ") ||
                "Restaurant location is being updated."}
            </p>

            {hasMap && (
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950"
              >
                Open Google Maps
              </a>
            )}
          </div>
        )}

        {activeTab === "food" && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Food Type
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(tags || []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100"
                >
                  {tag}
                </span>
              ))}

              {(amenities || []).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-slate-300"
                >
                  {item}
                </span>
              ))}

              {priceRange && (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-slate-300">
                  {priceRange}
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === "menu" && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Restaurant Menu
            </p>

            {visibleMenuImages.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {visibleMenuImages.map((image, index) => (
                  <a
                    key={`${image}-${index}`}
                    href={image}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-2xl border border-white/10 bg-black/30"
                  >
                    <img
                      src={image}
                      alt={`Restaurant menu ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-auto w-full object-contain"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm font-semibold text-slate-400">
                Menu images are being updated.
              </p>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                  Guest Reviews
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-3xl font-black text-white">
                    {averageRating.toFixed(1)}
                  </p>

                  <Stars value={Math.round(averageRating)} readonly />

                  <p className="text-sm font-bold text-slate-400">
                    {totalReviews} reviews
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              {canReview && completedBookingId ? (
                <form action={submitReview} className="space-y-4">
                  <input type="hidden" name="restaurantId" value={restaurantId} />
                  <input type="hidden" name="bookingId" value={completedBookingId} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="rating" value={rating} />

                  <div>
                    <p className="text-sm font-black text-white">
                      Viết review của anh
                    </p>

                    <div className="mt-3">
                      <Stars value={rating} onChange={setRating} />
                    </div>
                  </div>

                  <div>
                    <textarea
                      name="comment"
                      value={comment}
                      onChange={(event) => {
                        if (event.target.value.length <= 200) {
                          setComment(event.target.value);
                        }
                      }}
                      maxLength={200}
                      rows={3}
                      placeholder="Chia sẻ trải nghiệm của anh sau khi dùng dịch vụ..."
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60"
                    />

                    <p className="mt-2 text-right text-xs font-bold text-slate-500">
                      {comment.length}/200
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? "Đang gửi..." : "Gửi review"}
                  </button>
                </form>
              ) : (
                <p className="text-sm font-semibold leading-6 text-slate-400">
                  {alreadyReviewed
                    ? "Anh đã review booking completed tại nhà hàng này rồi."
                    : "Chỉ khách đã có booking completed tại nhà hàng này mới được viết review."}
                </p>
              )}

              {reviewState.message && (
                <p
                  className={
                    reviewState.success
                      ? "mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-200"
                      : "mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-200"
                  }
                >
                  {reviewState.message}
                </p>
              )}
            </div>

            <div className="mt-5 space-y-3">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-black text-white">
                          {review.customer_name || "Customer"}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {formatDate(review.created_at)}
                        </p>
                      </div>

                      <Stars value={review.rating} readonly />
                    </div>

                    <p className="mt-3 break-words text-sm font-semibold leading-7 text-slate-300">
                      {review.comment}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-slate-400">
                  Chưa có review nào cho nhà hàng này.
                </p>
              )}
            </div>

            {hasMoreReviews && (
              <button
                type="button"
                onClick={loadMoreReviews}
                disabled={loadingMore}
                className="mt-5 w-full rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? "Đang tải..." : "Xem thêm review"}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}