import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import CustomerBookingsClient from "@/components/customer-bookings-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CustomerBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?_loop_guard=1");

  const { data: bookings } = await adminClient
    .from("bookings")
    .select("id, booking_code, service_name, booking_date, booking_time, status")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order("created_at", { ascending: false });

  return <CustomerBookingsClient bookings={bookings || []} />;
}
