import Link from "next/link";
import { getRestaurantImageUrl } from "@/lib/restaurants/images";

type Props = {
  restaurant: {
    id: string;
    name?: string | null;
    slug?: string | null;
    address?: string | null;
    cover_image?: string | null;
    image_url?: string | null;
    discount_percent?: number | null;
    cuisine_type?: string | null;
    cuisine?: string | null;
    category?: string | null;
  };
};

export default function RestaurantCard({ restaurant }: Props) {
  const image =
    getRestaurantImageUrl(restaurant.cover_image) ||
    getRestaurantImageUrl(restaurant.image_url);

  const discount = Number(restaurant.discount_percent ?? 5);
  const cuisine =
    restaurant.cuisine_type ||
    restaurant.cuisine ||
    restaurant.category ||
    "Ẩm thực";

  return (
    <Link
      href={restaurant.slug ? `/restaurants/${restaurant.slug}` : "/restaurants"}
      className="group overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-56 w-full overflow-hidden bg-amber-50">
        {image ? (
          <img
            src={image}
            alt={restaurant.name || "Restaurant"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">
            🏪
          </div>
        )}

        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
          {cuisine}
        </div>

        <div className="absolute right-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white shadow-sm">
          Giảm {discount}%
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-black text-slate-950">
          {restaurant.name || "Restaurant"}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
          {restaurant.address || "Chưa cập nhật địa chỉ"}
        </p>

        <div className="mt-4 inline-flex rounded-xl border border-amber-200 px-4 py-2 text-sm font-black text-amber-700 group-hover:bg-amber-50">
          Xem chi tiết →
        </div>
      </div>
    </Link>
  );
}