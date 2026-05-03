"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { getRestaurantImageUrl } from "@/lib/restaurants/images";

type Props = {
  name: string;
  coverImage?: string | null;
  galleryImages?: string[];
};

export default function RestaurantGallery({
  name,
  coverImage,
  galleryImages = [],
}: Props) {
  const images = useMemo(() => {
    const merged = [coverImage, ...galleryImages]
      .map((item) => getRestaurantImageUrl(item))
      .filter(Boolean);

    return [...new Set(merged)];
  }, [coverImage, galleryImages]);

  const [activeIndex, setActiveIndex] = useState(0);

  if (!images.length) {
    return <div className="h-[320px] w-full rounded-[28px] bg-white/10 md:h-[460px]" />;
  }

  const activeImage = images[activeIndex];

  return (
    <div className="space-y-3">
      <div className="relative h-[320px] w-full overflow-hidden rounded-[28px] bg-[#19150f] shadow-sm md:h-[500px]">
        <Image
          src={activeImage}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 780px"
          priority={activeIndex === 0}
          className="object-cover transition duration-500"
        />

        <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => {
            const active = index === activeIndex;

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-2xl border-2 transition md:h-24 md:w-32 ${
                  active
                    ? "scale-[1.02] border-yellow-500"
                    : "border-transparent opacity-75 hover:opacity-100"
                }`}
              >
                <Image
                  src={image}
                  alt={`${name} ${index + 1}`}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}