import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-current-user-role";

export async function getCurrentSupplier() {
  const current = await requireRole("supplier");
  const supabase = await createClient();

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select("id, user_id, company_name, contact_name, phone, email, address, city, is_active")
    .eq("user_id", current.user.id)
    .maybeSingle();

  if (error || !supplier) {
    redirect("/dashboard");
  }

  if (!supplier.is_active) {
    redirect("/dashboard");
  }

  return {
    current,
    supplier,
  };
}