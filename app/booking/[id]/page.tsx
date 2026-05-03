import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: booking, error } = await adminClient
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("BOOKING_DETAIL_ERROR:", error.message);
  }

  if (!booking) {
    notFound();
  }

  return (
    <main className="relative min-h-screen bg-[#080704] px-4 py-10 text-white md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute right-[-140px] top-20 h-[520px] w-[520px] rounded-full bg-orange-700/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.1)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <section className="relative mx-auto max-w-3xl">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-600 text-3xl text-slate-950 shadow-2xl shadow-amber-900/30">
              ✓
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-amber-300">
              Booking Confirmation
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
              Booking Created
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Your reservation has been successfully submitted.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black/20">
            <Row label="Booking Code" value={booking.booking_code} />
            <Row label="Customer Name" value={booking.customer_name} />
            <Row label="Phone" value={booking.phone} />
            <Row label="WhatsApp" value={booking.whatsapp} />
            <Row label="Restaurant" value={booking.service_name} />
            <Row label="Guests" value={booking.guests} />
            <Row label="Date" value={booking.booking_date} />
            <Row label="Time" value={booking.booking_time} />
            <Row label="Status" value={booking.status} />
          </div>

          <div className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
            <p className="text-sm font-black text-emerald-200">
              Customer Benefit
            </p>
            <p className="mt-2 text-4xl font-black text-emerald-300">5%</p>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">
              This discount will be applied directly to your bill at the
              restaurant according to Mvip Booking policy.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/dashboard/customer"
              className="block w-full rounded-2xl bg-amber-300 px-5 py-4 text-center text-sm font-black text-slate-950 shadow-xl shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-200"
            >
              Go to Customer Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 last:border-b-0">
      <span className="text-sm font-bold text-slate-400">{label}</span>
      <span className="text-right text-sm font-black text-white">
        {String(value || "—")}
      </span>
    </div>
  );
}