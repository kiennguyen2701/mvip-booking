import { redirect } from "next/navigation";
import CustomerDashboardClient from "@/components/customer-dashboard-client";
import { createClient } from "@/lib/supabase/server";
import { getPublicRestaurants } from "@/lib/restaurants/get-public-restaurants";

export const dynamic = "force-dynamic";

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

    getPublicRestaurants({
      limit: 90,
    }),
  ]);

  const profileRow = profileResult.data;
  const role = profileRow?.role || user.user_metadata?.role;

  if (role && role !== "customer") {
    redirect("/dashboard");
  }

  return (
    <CustomerDashboardClient
      profile={{
        fullName:
          profileRow?.full_name ||
          user.user_metadata?.full_name ||
          user.email ||
          "Customer",
        email: profileRow?.email || user.email || "",
        refCode: profileRow?.referred_by_ref_code || "",
        preferredLanguage:
          profileRow?.preferred_language === "zh" ? "zh" : "en",
      }}
      restaurants={restaurants}
    />
  );
}