"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Restaurant = {
  id: string;
  name: string;
  city: string | null;
  cover_image: string | null;
};

export default function CustomerDashboardClient() {
  const supabase = createClient();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, city, cover_image")
        .eq("is_active", true)
        .limit(20);

      if (!error && data) {
        setRestaurants(data);
      }

      setLoading(false);
    };

    fetchRestaurants();
  }, []);

  return (
    <div className="px-4 pb-20 pt-4">
      {/* HERO */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white">
          Welcome 👋
        </h1>
        <p className="text-sm text-gray-400">
          Discover premium restaurants
        </p>
      </div>

      {/* BENEFIT */}
      <div className="mb-4 rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4">
        <p className="text-xs text-yellow-400 tracking-widest">
          MEMBER BENEFIT
        </p>
        <p className="text-lg font-bold text-white">
          5% OFF
        </p>
      </div>

      {/* SEARCH */}
      <div className="mb-4 flex gap-2">
        <input
          placeholder="Search restaurant..."
          className="flex-1 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white outline-none"
        />
        <button className="rounded-lg bg-yellow-500 px-4 text-sm font-semibold text-black">
          Go
        </button>
      </div>

      {/* LIST */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : restaurants.length === 0 ? (
        <p className="text-sm text-red-400">
          No restaurants found (check DB / is_active)
        </p>
      ) : (
        <div className="space-y-3">
          {restaurants.map((r) => (
            <div
              key={r.id}
              className="overflow-hidden rounded-xl bg-gray-900"
            >
              {r.cover_image && (
                <img
                  src={r.cover_image}
                  alt={r.name}
                  className="h-32 w-full object-cover"
                />
              )}

              <div className="p-3">
                <p className="font-semibold text-white">
                  {r.name}
                </p>
                <p className="text-xs text-gray-400">
                  {r.city || "Unknown location"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}