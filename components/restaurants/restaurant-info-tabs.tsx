"use client";

import { useMemo, useState } from "react";

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
};

const tabs = [
  { key: "about", label: "Introduction" },
  { key: "hours", label: "Opening Hours" },
  { key: "location", label: "Location" },
  { key: "food", label: "Food Type" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

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
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("about");

  const hours = useMemo(() => {
    if (!openingHours) return [];
    return Object.entries(openingHours).filter(([, value]) => Boolean(value));
  }, [openingHours]);

  const hasMap =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/25 backdrop-blur-2xl md:rounded-[36px] md:p-6">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                active
                  ? "whitespace-nowrap rounded-xl bg-amber-300 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-950 shadow-lg shadow-amber-500/20"
                  : "whitespace-nowrap rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {activeTab === "about" && (
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-300">
              About Restaurant
            </p>

            <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
              {shortDescription ||
                "Restaurant introduction is being updated."}
            </p>

            {fullDescription && (
              <div
                className="prose prose-invert mt-5 max-w-none text-sm leading-7 text-slate-300"
                dangerouslySetInnerHTML={{ __html: fullDescription }}
              />
            )}
          </div>
        )}

        {activeTab === "hours" && (
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-300">
              Opening Hours
            </p>

            {hours.length ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {hours.map(([day, time]) => (
                  <div
                    key={day}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm"
                  >
                    <span className="font-black capitalize text-white">
                      {day}
                    </span>
                    <span className="font-bold text-slate-400">{time}</span>
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
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-300">
              Location
            </p>

            <h3 className="mt-4 text-xl font-black text-white">
              {address || "Address is being updated"}
            </h3>

            <p className="mt-2 text-sm font-semibold text-slate-400">
              {city || "City is being updated"}
            </p>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]">
              {hasMap ? (
                <iframe
                  title="Restaurant location"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    longitude - 0.01
                  }%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${
                    latitude + 0.01
                  }&layer=mapnik&marker=${latitude}%2C${longitude}`}
                  className="h-[320px] w-full border-0"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center p-6 text-center text-sm font-semibold text-slate-400">
                  Map location is not available yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "food" && (
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-300">
              Food Type
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(tags?.length ? tags : ["Signature Dining"]).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-100"
                >
                  {tag}
                </span>
              ))}
            </div>

            {!!amenities?.length && (
              <>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.26em] text-slate-500">
                  Amenities
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {amenities.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-slate-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </>
            )}

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Price Range
              </p>
              <p className="mt-2 text-lg font-black text-white">
                {priceRange || "Updating"}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}