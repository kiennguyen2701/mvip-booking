import Link from "next/link";
import CancelBookingButton from "@/components/booking/cancel-booking-button";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{ id: string }>;
};

type RestaurantLocation = {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

function buildGoogleMapsUrl({
  restaurantName,
  address,
  city,
  latitude,
  longitude,
}: {
  restaurantName?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  if (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  const query = [restaurantName, address, city].filter(Boolean).join(", ");

  if (!query) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

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

  let restaurant: RestaurantLocation | null = null;

  if (booking.restaurant_id) {
    const { data: restaurantData, error: restaurantError } = await adminClient
      .from("restaurants")
      .select("id, name, address, city, latitude, longitude")
      .eq("id", booking.restaurant_id)
      .maybeSingle();

    if (restaurantError) {
      console.error("BOOKING_RESTAURANT_LOCATION_ERROR:", restaurantError.message);
    }

    restaurant = restaurantData as RestaurantLocation | null;
  }

  const guests =
    booking.guests ||
    booking.number_of_guests ||
    booking.pax ||
    booking.quantity ||
    "—";

  const restaurantName =
    restaurant?.name || booking.service_name || "Restaurant";

  const restaurantAddress = [restaurant?.address, restaurant?.city]
    .filter(Boolean)
    .join(", ");

  const googleMapsUrl = buildGoogleMapsUrl({
    restaurantName,
    address: restaurant?.address,
    city: restaurant?.city,
    latitude: restaurant?.latitude,
    longitude: restaurant?.longitude,
  });

  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#080704] px-4 py-6 text-white md:px-6 md:py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[360px] w-[360px] rounded-full bg-amber-500/20 blur-3xl md:h-[460px] md:w-[460px]" />
        <div className="absolute right-[-180px] top-20 h-[420px] w-[420px] rounded-full bg-orange-700/20 blur-3xl md:h-[520px] md:w-[520px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.1)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <section className="relative mx-auto w-full max-w-[680px]">
        <div className="w-full max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:rounded-[36px] md:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-600 text-3xl text-slate-950 shadow-2xl shadow-amber-900/30 md:h-16 md:w-16 md:rounded-3xl">
              ✓
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.25em] text-amber-300 md:text-xs">
              Booking Confirmation
            </p>

            <h1 className="mt-3 break-words text-3xl font-black tracking-tight text-white md:text-4xl">
              Booking Created
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Your reservation has been successfully submitted.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-black/20 md:mt-8">
            <Row label="Booking Code" value={booking.booking_code} />
            <Row label="Customer Name" value={booking.customer_name} />
            <Row label="Restaurant" value={restaurantName} />
            <Row label="Address" value={restaurantAddress || "—"} />
            <Row label="Guests" value={guests} />
            <Row label="Date" value={booking.booking_date} />
            <Row label="Time" value={booking.booking_time} />
            <Row label="Status" value={booking.status} />
          </div>

          {googleMapsUrl ? (
            <div className="mt-4">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-4 text-sm font-black text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/15"
              >
                📍 Open Restaurant Location
              </a>
            </div>
          ) : null}

          <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4 md:mt-6 md:p-5">
            <p className="text-sm font-black text-emerald-200">
              Customer Benefit
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-300 md:text-4xl">
              5%
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">
              This discount will be applied directly to your bill at the
              restaurant according to Mvip Booking policy.
            </p>
          </div>

          <div className="mt-6 md:mt-8">
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
    <div className="grid w-full max-w-full grid-cols-1 gap-1 border-b border-white/10 px-4 py-4 last:border-b-0 md:grid-cols-[180px_1fr] md:gap-4 md:px-5">
      <span className="min-w-0 text-xs font-bold uppercase tracking-wide text-slate-400 md:text-sm md:normal-case md:tracking-normal">
        {label}
      </span>

      <span className="min-w-0 break-words text-left text-sm font-black text-white md:text-right">
        {String(value || "—")}
      </span>
    </div>
  );
}
