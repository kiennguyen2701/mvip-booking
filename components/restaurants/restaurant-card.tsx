import Image from "next/image";
import Link from "next/link";
import { getRestaurantImageUrl } from "@/lib/restaurants/images";

function getAverageRating(restaurant: any) {
  const rating = Number(restaurant.average_rating || 5);
  return rating.toFixed(1);
}

export default function RestaurantCard({ restaurant }: any) {
  const image =
    getRestaurantImageUrl(restaurant.cover_image) ||
    getRestaurantImageUrl(restaurant.image_url);

  const rating = getAverageRating(restaurant);

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
            alt={restaurant.name || "Restaurant"}
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
          <h3 className="font-bold">{restaurant.name}</h3>

          <span className="shrink-0 rounded-xl bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">
            {rating} ★
          </span>
        </div>

        <p className="mt-1 text-sm text-gray-500">{restaurant.address}</p>
      </div>
    </Link>
  );
}