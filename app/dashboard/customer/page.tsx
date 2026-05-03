import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import CustomerDashboardClient from "../../../components/customer-dashboard-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CustomerDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await adminClient
    .from("users")
    .select("id, role, full_name, email, ref_code")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role || user.user_metadata?.role;

  if (role !== "customer") redirect("/dashboard");

  const { data: restaurants, error: restaurantsError } = await adminClient
    .from("restaurants")
    .select(
      `
      id,
      name,
      slug,
      address,
      city,
      cuisine_type,
      category,
      short_description,
      description,
      cover_image,
      image_url,
      latitude,
      longitude,
      price_range,
      is_active,
      created_at
    `
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (restaurantsError) {
    console.error("CUSTOMER RESTAURANTS ERROR:", restaurantsError.message);
  }

  console.log("CUSTOMER RESTAURANTS:", restaurants?.length ?? 0);

  return (
    <CustomerDashboardClient
      profile={{
        fullName: profile?.full_name || user.email || "Customer",
        email: profile?.email || user.email || "",
        refCode: profile?.ref_code || "",
      }}
      restaurants={restaurants || []}
    />
  );
}