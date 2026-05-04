"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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

    return Array.from(new Set(merged)).slice(0, 8);
  }, [coverImage, galleryImages]);

  const [activeIndex, setActiveIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="h-[240px] w-full rounded-[24px] bg-white/10 sm:h-[320px] md:h-[460px]" />
    );
  }

  const activeImage = images[activeIndex] || images[0];

  return (
    <section className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-black/35 p-3 shadow-2xl shadow-black/30 md:p-4">
      <div className="relative h-[250px] w-full overflow-hidden rounded-[22px] bg-[#19150f] sm:h-[340px] md:h-[500px]">
        <Image
          src={activeImage}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 780px"
          quality={76}
          priority={activeIndex === 0}
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

        <div className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1.5 text-xs font-black text-white backdrop-blur md:bottom-4 md:left-4 md:px-4 md:py-2 md:text-sm">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-3">
          {images.map((image, index) => {
            const active = index === activeIndex;

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl border-2 transition sm:h-20 sm:w-28 md:h-24 md:w-32 ${
                  active
                    ? "border-amber-300 opacity-100"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={image}
                  alt={`${name} ${index + 1}`}
                  fill
                  sizes="128px"
                  quality={55}
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}