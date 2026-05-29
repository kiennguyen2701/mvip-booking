import CancelBookingButton from "@/components/booking/cancel-booking-button";
import BookingConfirmationClient from "@/components/booking/booking-confirmation-client";
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

  let restaurant = null;

  if (booking.restaurant_id) {
    const { data: restaurantData, error: restaurantError } = await adminClient
      .from("restaurants")
      .select("id, name, name_zh, address, address_zh, city, city_zh, latitude, longitude")
      .eq("id", booking.restaurant_id)
      .maybeSingle();

    if (restaurantError) {
      console.error("BOOKING_RESTAURANT_LOCATION_ERROR:", restaurantError.message);
    }

    restaurant = restaurantData;
  }

  const guests =
    booking.guests ||
    booking.number_of_guests ||
    booking.pax ||
    booking.quantity ||
    2;

  return (
    <>
      <BookingConfirmationClient
        booking={{
          id: booking.id,
          bookingCode: String(booking.booking_code || "—"),
          customerName: String(booking.customer_name || "—"),
          bookingDate: String(booking.booking_date || "—"),
          bookingTime: String(booking.booking_time || "—"),
          guests,
          status: String(booking.status || "pending"),
          customerLanguage: (booking.customer_language === "zh" ? "zh" : "en") as "en" | "zh",
        }}
        restaurant={
          restaurant
            ? {
                nameEn: restaurant.name || null,
                nameZh: restaurant.name_zh || null,
                addressEn: restaurant.address || null,
                addressZh: restaurant.address_zh || null,
                cityEn: restaurant.city || null,
                cityZh: restaurant.city_zh || null,
                latitude: restaurant.latitude || null,
                longitude: restaurant.longitude || null,
              }
            : null
        }
        serviceNameFallback={String(booking.service_name || "Restaurant")}
        cancelButton={
          <CancelBookingButton
            bookingId={id}
            status={String(booking.status || "pending")}
          />
        }
      />
    </>
  );
}
