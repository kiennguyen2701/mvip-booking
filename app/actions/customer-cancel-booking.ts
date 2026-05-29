// app/actions/customer-cancel-booking.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  enqueueBookingCancelledEmailJob,
} from "@/lib/email/email-queue";
import { processEmailJobsForBooking } from "@/lib/email/process-email-jobs-helper";

export type CancelBookingResult = {
  success: boolean;
  message: string;
};

const CANCELLABLE_STATUSES = ["pending", "confirmed"];

export async function cancelBookingByCustomer(
  bookingId: string,
): Promise<CancelBookingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  // Chỉ cho hủy booking của chính mình
  const { data: booking, error: fetchError } = await adminClient
    .from("bookings")
    .select(
      `id, booking_code, status, customer_name, email, phone, whatsapp,
       service_name, supplier_id, agent_id, booking_date, booking_time,
       guests, guest_count`,
    )
    .eq("id", bookingId)
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  if (fetchError || !booking) {
    return { success: false, message: "Booking not found." };
  }

  if (!CANCELLABLE_STATUSES.includes(booking.status as string)) {
    return {
      success: false,
      message:
        booking.status === "cancelled"
          ? "This booking has already been cancelled."
          : "This booking cannot be cancelled.",
    };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await adminClient
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancellation_reason: "Cancelled by customer",
      updated_at: now,
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  // Log
  await adminClient.from("booking_status_logs").insert({
    booking_id: bookingId,
    old_status: booking.status,
    new_status: "cancelled",
    changed_by_role: "customer",
    note: "Cancelled by customer via booking page.",
    created_at: now,
  });

  // Gửi email thông báo hủy
  try {
    const [{ data: supplierRow }, { data: agentRow }] = await Promise.all([
      booking.supplier_id
        ? adminClient
            .from("suppliers")
            .select("email, login_email")
            .eq("id", booking.supplier_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      booking.agent_id
        ? adminClient
            .from("agents")
            .select("email")
            .eq("id", booking.agent_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    await enqueueBookingCancelledEmailJob({
      bookingId,
      customerEmail: booking.email,
      supplierEmail:
        supplierRow?.email || supplierRow?.login_email || null,
      agentEmail: agentRow?.email || null,
      adminEmail: process.env.ADMIN_EMAIL || null,
      customerName: booking.customer_name || "Customer",
      restaurantName: booking.service_name || "Restaurant",
      bookingCode: booking.booking_code || bookingId,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
      cancellationReason: "Cancelled by customer",
    });

    await processEmailJobsForBooking(bookingId);
  } catch (emailError) {
    console.error("CUSTOMER_CANCEL_EMAIL_ERROR:", emailError);
    // Không block — booking đã cancelled thành công
  }

  revalidatePath(`/booking/${bookingId}`);
  revalidatePath("/dashboard/customer/bookings");
  revalidatePath("/dashboard/customer");

  return { success: true, message: "Booking cancelled successfully." };
}