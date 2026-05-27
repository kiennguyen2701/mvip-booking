import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicRestaurants } from "@/lib/restaurants/get-public-restaurants";
import CustomerDashboardClient from "@/components/customer-dashboard-client";

// Auth check vẫn dynamic — mỗi user khác nhau
export const dynamic = "force-dynamic";

// Restaurants list được cache riêng qua Redis (TTL 3600s trong get-public-restaurants.ts)
// Chỉ auth + profile là dynamic, còn data nhà hàng dùng cache

export default async function CustomerPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const [profileResult, restaurants] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role, referred_by_ref_code, preferred_language")
      .eq("id", user.id)
      .maybeSingle(),

    // Restaurants được cache Redis 3600s — hầu hết request không tốn DB query
    getPublicRestaurants({ limit: 90 }),
  ]);

  const profileRow = profileResult.data;
  const role = profileRow?.role || user.user_metadata?.role;

  if (role && role !== "customer") {
    redirect("/dashboard");
  }

  const preferredLanguage =
    profileRow?.preferred_language === "zh" ? "zh" : "en";

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050403] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-amber-300 border-t-transparent animate-spin" />
      </div>
    }>
      <CustomerDashboardClient
        profile={{
          fullName:
            profileRow?.full_name ||
            user.user_metadata?.full_name ||
            user.email ||
            "Customer",
          email: profileRow?.email || user.email || "",
          refCode: profileRow?.referred_by_ref_code || "",
          preferredLanguage,
        }}
        restaurants={restaurants}
        preferredLanguage={preferredLanguage}
      />
    </Suspense>
  );
}
