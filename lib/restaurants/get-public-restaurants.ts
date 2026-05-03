import { createClient } from "@/lib/supabase/server";

export async function getPublicRestaurants() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPublicRestaurants error:", error);
    return [];
  }

  return data || [];
}