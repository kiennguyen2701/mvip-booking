import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;

  if (role === "admin") redirect("/dashboard/admin");
  if (role === "supplier") redirect("/dashboard/supplier");
  if (role === "agent") redirect("/dashboard/agent");
  if (role === "customer") redirect("/dashboard/customer");

  redirect("/login");
}