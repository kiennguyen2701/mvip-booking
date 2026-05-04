import Image from "next/image";
import Link from "next/link";
import { getRestaurantImageUrl } from "@/lib/restaurants/images";

export default function RestaurantCard({ restaurant }: any) {
  const image =
    getRestaurantImageUrl(restaurant.cover_image) ||
    getRestaurantImageUrl(restaurant.image_url);

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      prefetch={false} // ✅ cực quan trọng
      className="block overflow-hidden rounded-2xl border bg-white"
    >
      <div className="relative h-44 w-full">
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="100vw"
            quality={60} // ✅ giảm nặng
            loading="lazy"
            className="object-cover"
          />
        )}
      </div>

      <div className="p-3">
        <h3 className="font-bold">{restaurant.name}</h3>
        <p className="text-sm text-gray-500">
          {restaurant.address}
        </p>
      </div>
    </Link>
  );
}