import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getCurrentSupplier } from "@/lib/suppliers/get-current-supplier";
import {
  sendBookingCancelledEmails,
  sendBookingCompletedEmails,
  sendBookingConfirmedEmail,
} from "@/lib/email/send-booking-emails";
import { SupplierBookingsClient } from "@/components/dashboard/supplier-bookings-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

type BookingRow = {
  id: string;
  booking_code?: string | null;

  customer_full_name?: string | null;
  customer_name?: string | null;
  name?: string | null;

  customer_email?: string | null;
  email?: string | null;

  customer_phone?: string | null;
  phone?: string | null;

  customer_whatsapp?: string | null;
  whatsapp?: string | null;

  restaurant_id?: string | null;
  supplier_id?: string | null;
  service_name?: string | null;
  agent_id?: string | null;

  booking_date?: string | null;
  booking_time?: string | null;
  guest_count?: number | null;
  guests?: number | null;

  note?: string | null;
  supplier_note?: string | null;
  cancellation_reason?: string | null;

  status?: string | null;

  total_bill?: number | null;
  customer_discount_amount?: number | null;
  platform_commission_amount?: number | null;
  agent_commission_amount?: number | null;
  platform_net_amount?: number | null;

  created_at?: string | null;
  updated_at?: string | null;

  restaurants?: unknown;
  booking_status_logs?: unknown;
};

function normalizeStatus(value?: string | null): BookingStatus {
  if (value === "confirmed") return "confirmed";
  if (value === "completed") return "completed";
  if (value === "cancelled" || value === "canceled") return "cancelled";
  return "pending";
}

function getAllowedNextStatuses(status?: string | null): BookingStatus[] {
  const value = normalizeStatus(status);

  if (value === "pending") return ["confirmed", "cancelled"];
  if (value === "confirmed") return ["completed", "cancelled"];

  return [];
}

function isValidTransition(oldStatus: string, newStatus: string) {
  return getAllowedNextStatuses(oldStatus).includes(newStatus as BookingStatus);
}

function isLockedStatus(status?: string | null) {
  const value = normalizeStatus(status);
  return value === "completed" || value === "cancelled";
}

function calculateCommission(totalBill: number) {
  return {
    customerDiscountAmount: totalBill * 0.05,
    platformCommissionAmount: totalBill * 0.1,
    agentCommissionAmount: totalBill * 0.05,
    platformNetAmount: totalBill * 0.05,
  };
}

function getRestaurant(booking: BookingRow) {
  return booking.restaurants as { name?: string } | null;
}

function getCustomerName(booking: BookingRow) {
  return (
    booking.customer_full_name ||
    booking.customer_name ||
    booking.name ||
    "Customer"
  );
}

function getCustomerEmail(booking: BookingRow) {
  return booking.customer_email || booking.email || null;
}

async function getRestaurantName(booking: BookingRow) {
  if (booking.service_name) return booking.service_name;

  const restaurant = getRestaurant(booking);
  if (restaurant?.name) return restaurant.name;

  if (!booking.restaurant_id) return "Restaurant";

  const { data } = await adminClient
    .from("restaurants")
    .select("id, name")
    .eq("id", booking.restaurant_id)
    .maybeSingle();

  return data?.name || "Restaurant";
}

async function getAgentEmail(agentId?: string | null) {
  if (!agentId) return null;

  const { data } = await adminClient
    .from("agents")
    .select("id, email")
    .eq("id", agentId)
    .maybeSingle();

  return data?.email || null;
}

async function updateSupplierBookingStatus(formData: FormData) {
  "use server";

  const { supplier } = await getCurrentSupplier();

  const id = String(formData.get("id") || "").trim();
  const nextStatus = normalizeStatus(String(formData.get("status") || ""));
  const totalBill = Number(formData.get("total_bill") || 0);
  const cancellationReason = String(
    formData.get("cancellation_reason") || "",
  ).trim();

  const redirectBase = `/dashboard/supplier/bookings?booking=${id}`;

  if (!id) {
    redirect(`/dashboard/supplier/bookings?error=missing_id`);
  }

  const { data: currentBooking, error: currentBookingError } = await adminClient
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("supplier_id", supplier.id)
    .maybeSingle();

  if (currentBookingError || !currentBooking) {
    redirect(
      `${redirectBase}&error=${encodeURIComponent(
        currentBookingError?.message || "Booking not found",
      )}`,
    );
  }

  const booking = currentBooking as BookingRow;
  const oldStatus = normalizeStatus(booking.status);

  if (isLockedStatus(oldStatus)) {
    redirect(`${redirectBase}&error=status_locked`);
  }

  if (nextStatus === oldStatus) {
    redirect(`${redirectBase}&success=no_change`);
  }

  if (!isValidTransition(oldStatus, nextStatus)) {
    redirect(`${redirectBase}&error=invalid_status_transition`);
  }

  if (nextStatus === "completed" && (!totalBill || totalBill <= 0)) {
    redirect(`${redirectBase}&error=missing_total_bill`);
  }

  if (nextStatus === "cancelled" && !cancellationReason) {
    redirect(`${redirectBase}&error=missing_cancellation_reason`);
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, string | number | null> = {
    status: nextStatus,
    updated_at: now,
  };

  if (nextStatus === "confirmed") {
    updatePayload.confirmed_at = now;
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  if (nextStatus === "completed") {
    const amounts = calculateCommission(totalBill);

    updatePayload.completed_at = now;
    updatePayload.total_bill = totalBill;
    updatePayload.customer_discount_amount = amounts.customerDiscountAmount;
    updatePayload.platform_commission_amount = amounts.platformCommissionAmount;
    updatePayload.agent_commission_amount = amounts.agentCommissionAmount;
    updatePayload.platform_net_amount = amounts.platformNetAmount;
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  if (nextStatus === "cancelled") {
    updatePayload.cancelled_at = now;
    updatePayload.cancellation_reason = cancellationReason;
  }

  const { error } = await adminClient
    .from("bookings")
    .update(updatePayload)
    .eq("id", id)
    .eq("supplier_id", supplier.id);

  if (error) {
    redirect(`${redirectBase}&error=${encodeURIComponent(error.message)}`);
  }

  await adminClient.from("booking_status_logs").insert({
    booking_id: id,
    old_status: oldStatus,
    new_status: nextStatus,
    changed_by_role: "supplier",
    note:
      nextStatus === "completed"
        ? `Supplier completed booking. Total bill: ${totalBill}`
        : nextStatus === "cancelled"
          ? `Supplier cancelled booking. Reason: ${cancellationReason || "-"}`
          : "Supplier confirmed booking.",
    created_at: now,
  });

  const restaurantName = await getRestaurantName(booking);
  const customerEmail = getCustomerEmail(booking);

  if (oldStatus === "pending" && nextStatus === "confirmed") {
    await sendBookingConfirmedEmail({
      customerEmail,
      customerName: getCustomerName(booking),
      restaurantName,
      bookingCode: booking.booking_code || booking.id,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
    });
  }

  if (oldStatus === "confirmed" && nextStatus === "completed") {
    const amounts = calculateCommission(totalBill);

    await sendBookingCompletedEmails({
      customerEmail,
      supplierEmail: null,
      customerName: getCustomerName(booking),
      restaurantName,
      bookingCode: booking.booking_code || booking.id,
      totalBill,
      customerDiscountAmount: amounts.customerDiscountAmount,
      platformCommissionAmount: amounts.platformCommissionAmount,
      agentCommissionAmount: amounts.agentCommissionAmount,
      platformNetAmount: amounts.platformNetAmount,
    });
  }

  if (oldStatus === "confirmed" && nextStatus === "cancelled") {
    const agentEmail = await getAgentEmail(booking.agent_id);

    await sendBookingCancelledEmails({
      customerEmail,
      supplierEmail: null,
      agentEmail,
      customerName: getCustomerName(booking),
      restaurantName,
      bookingCode: booking.booking_code || booking.id,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
      cancellationReason,
    });
  }

  revalidatePath("/dashboard/supplier/bookings");
  revalidatePath("/dashboard/supplier");
  revalidatePath("/dashboard/admin/bookings");
  revalidatePath("/dashboard/customer");
  revalidatePath(`/booking/${id}`);

  redirect(`/dashboard/supplier/bookings?success=updated`);
}

export default async function SupplierBookingsPage() {
  const { supplier } = await getCurrentSupplier();

  const { data: bookingsData, error } = await adminClient
    .from("bookings")
    .select(
      `
      id,
      booking_code,
      customer_full_name,
      customer_name,
      name,
      customer_email,
      email,
      customer_phone,
      phone,
      customer_whatsapp,
      whatsapp,
      restaurant_id,
      supplier_id,
      service_name,
      agent_id,
      booking_date,
      booking_time,
      guest_count,
      guests,
      note,
      supplier_note,
      cancellation_reason,
      status,
      total_bill,
      customer_discount_amount,
      platform_commission_amount,
      agent_commission_amount,
      platform_net_amount,
      created_at,
      updated_at,
      restaurants(id,name,slug,city,address),
      booking_status_logs(
        id,
        old_status,
        new_status,
        changed_by_role,
        note,
        created_at
      )
    `,
    )
    .eq("supplier_id", supplier.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#fbf7ef] px-4 py-5 md:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <h1 className="text-xl font-black">Lỗi tải danh sách booking</h1>
          <p className="mt-2 text-sm">{error.message}</p>
        </div>
      </main>
    );
  }

  const bookings = ((bookingsData || []) as BookingRow[]).map((booking) => ({
    ...booking,
    status: normalizeStatus(booking.status),
  }));

  return (
    <SupplierBookingsClient
      bookings={bookings}
      updateAction={updateSupplierBookingStatus}
    />
  );
}