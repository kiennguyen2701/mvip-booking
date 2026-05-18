import Image from "next/image";
import Link from "next/link";
import { getRestaurantImageUrl } from "@/lib/restaurants/images";

type PreferredLanguage = "en" | "zh";

function getAverageRating(restaurant: any) {
  const rating = Number(restaurant.average_rating || 5);

  if (!Number.isFinite(rating) || rating <= 0) {
    return "5.0";
  }

  return rating.toFixed(1);
}

function getLocalizedText(
  restaurant: any,
  language: PreferredLanguage,
  enKey: string,
  zhKey: string,
) {
  const zhValue = restaurant?.[zhKey];
  const enValue = restaurant?.[enKey];

  if (language === "zh" && typeof zhValue === "string" && zhValue.trim()) {
    return zhValue;
  }

  if (typeof enValue === "string" && enValue.trim()) {
    return enValue;
  }

  return "";
}

export default function RestaurantCard({
  restaurant,
  preferredLanguage = "en",
}: {
  restaurant: any;
  preferredLanguage?: PreferredLanguage;
}) {
  const language: PreferredLanguage = preferredLanguage === "zh" ? "zh" : "en";

  const image =
    getRestaurantImageUrl(restaurant.cover_image) ||
    getRestaurantImageUrl(restaurant.image_url);

  const rating = getAverageRating(restaurant);
  const name =
    getLocalizedText(restaurant, language, "name", "name_zh") ||
    (language === "zh" ? "未命名餐厅" : "Restaurant");
  const address = getLocalizedText(restaurant, language, "address", "address_zh");
  const description =
    getLocalizedText(
      restaurant,
      language,
      "short_description",
      "short_description_zh",
    ) || getLocalizedText(restaurant, language, "description", "description_zh");

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      prefetch={false}
      className="block overflow-hidden rounded-2xl border bg-white"
    >
      <div className="relative h-44 w-full">
        {image && (
          <Image
            src={image}
            alt={name}
            fill
            sizes="100vw"
            quality={60}
            loading="lazy"
            className="object-cover"
          />
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold">{name}</h3>

          <span className="shrink-0 rounded-xl bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">
            {rating} ★
          </span>
        </div>

        {description ? (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">
            {description}
          </p>
        ) : null}

        {address ? <p className="mt-1 text-sm text-gray-500">{address}</p> : null}
      </div>
    </Link>
  );
}
