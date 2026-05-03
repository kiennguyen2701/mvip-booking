import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CustomerBookingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: bookings } = await adminClient
    .from("bookings")
    .select("*")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#fbf7ef] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase text-amber-700">
              Customer
            </p>
            <h1 className="text-2xl font-black text-slate-950">
              My Booking
            </h1>
          </div>

          <Link
            href="/dashboard/customer"
            className="rounded-xl border bg-white px-5 py-3 text-sm font-bold"
          >
            Quay lại
          </Link>
        </div>

        <section className="space-y-3">
          {(bookings || []).map((booking) => (
            <Link
              key={booking.id}
              href={`/booking/${booking.id}`}
              className="block rounded-2xl border border-white/80 bg-white p-5 shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <p className="font-black text-slate-950">
                    {booking.booking_code || booking.id}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {booking.service_name || "Restaurant"}
                  </p>
                </div>

                <div className="text-sm md:text-right">
                  <p className="font-bold text-slate-950">
                    {booking.booking_date || "-"} · {booking.booking_time || "-"}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Status: {booking.status || "pending"}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {!(bookings || []).length && (
            <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">
              Bạn chưa có booking nào.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}