// app/booking/[id]/page.tsx

import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import BookingConfirmationClient from "@/components/booking/booking-confirmation-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

type RestaurantLocation = {
  id: string;
  name: string | null;
  name_zh: string | null;
  address: string | null;
  address_zh: string | null;
  city: string | null;
  city_zh: string | null;
  latitude: number | null;
  longitude: number | null;
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

  let restaurant: RestaurantLocation | null = null;

  if (booking.restaurant_id) {
    const { data: restaurantData, error: restaurantError } = await adminClient
      .from("restaurants")
      .select("id, name, name_zh, address, address_zh, city, city_zh, latitude, longitude")
      .eq("id", booking.restaurant_id)
      .maybeSingle();

    if (restaurantError) {
      console.error("BOOKING_RESTAURANT_LOCATION_ERROR:", restaurantError.message);
    }

    restaurant = restaurantData as RestaurantLocation | null;
  }

  // Truyền toàn bộ data bilingual xuống client component
  return (
    <BookingConfirmationClient
      booking={{
        id: booking.id,
        bookingCode: String(booking.booking_code || "—"),
        customerName: String(booking.customer_name || "—"),
        bookingDate: String(booking.booking_date || "—"),
        bookingTime: String(booking.booking_time || "—"),
        guests: booking.guests || booking.number_of_guests || booking.pax || booking.guest_count || 2,
        status: String(booking.status || "pending"),
        // Ngôn ngữ đã lưu lúc book — dùng làm default trước khi cookie load
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
    />
  );
}
