'use client';

import { useMemo, useState } from 'react';
import { getRestaurantImageUrl } from '@/lib/restaurants/images';

type Props = {
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
};

const tabs = [
  { key: 'about', label: 'Introduction' },
  { key: 'hours', label: 'Opening Hours' },
  { key: 'location', label: 'Location' },
  { key: 'food', label: 'Food Type' },
  { key: 'menu', label: 'Menu' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function RestaurantInfoTabs({
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
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('about');

  const hours = useMemo(() => {
    if (!openingHours) return [];
    return Object.entries(openingHours).filter(([, value]) => Boolean(value));
  }, [openingHours]);

  const visibleMenuImages = useMemo(() => {
    return (menuImages || [])
      .map((image) => getRestaurantImageUrl(image) || image)
      .filter(Boolean);
  }, [menuImages]);

  const hasMap =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    <section className="w-full max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-3 shadow-2xl shadow-black/25 backdrop-blur-2xl md:rounded-[36px] md:p-6">
      <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                active
                  ? 'shrink-0 whitespace-nowrap rounded-xl bg-amber-300 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-400 transition hover:bg-white/[0.06] hover:text-white'
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 max-w-full overflow-hidden md:mt-5">
        {activeTab === 'about' && (
          <div className="max-w-full overflow-hidden rounded-[22px] border border-white/10 bg-black/20 p-4 md:p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              About Restaurant
            </p>

            <p className="mt-4 break-words text-sm font-semibold leading-7 text-slate-300">
              {shortDescription || 'Restaurant introduction is being updated.'}
            </p>

            {fullDescription && (
              <div
                className="prose prose-invert mt-5 max-w-none break-words text-sm leading-7 text-slate-300 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl [&_p]:my-3"
                dangerouslySetInnerHTML={{ __html: fullDescription }}
              />
            )}
          </div>
        )}

        {activeTab === 'hours' && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 md:p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Opening Hours
            </p>

            {hours.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {hours.map(([day, value]) => (
                  <div
                    key={day}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm"
                  >
                    <span className="font-black capitalize text-white">
                      {day}
                    </span>
                    <span className="text-right font-semibold text-slate-300">
                      {value}
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

        {activeTab === 'location' && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 md:p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Location
            </p>

            <p className="mt-4 break-words text-sm font-semibold leading-7 text-slate-300">
              {[address, city].filter(Boolean).join(', ') ||
                'Restaurant location is being updated.'}
            </p>

            {hasMap && (
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
              >
                Open Google Maps
              </a>
            )}
          </div>
        )}

        {activeTab === 'food' && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 md:p-5">
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

            {!tags?.length && !amenities?.length && !priceRange && (
              <p className="mt-4 text-sm font-semibold text-slate-400">
                Food type information is being updated.
              </p>
            )}
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 md:p-5">
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
                    className="block overflow-hidden rounded-2xl border border-white/10 bg-black/30 transition hover:border-amber-300/40"
                  >
                    <img
                      src={image}
                      alt={`Restaurant menu ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
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
      </div>
    </section>
  );
}