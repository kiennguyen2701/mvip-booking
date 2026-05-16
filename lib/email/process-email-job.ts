// lib/email/process-email-job.ts

import {
  sendBookingCancelledEmails,
  sendBookingCompletedEmails,
  sendBookingConfirmedEmail,
  sendBookingCreatedEmails,
} from "@/lib/email/send-booking-emails";
import { adminClient } from "@/lib/supabase/admin";

type EmailJobRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
};



type PreferredLanguage = "en" | "zh";

function normalizePreferredLanguage(value: unknown): PreferredLanguage {
  return String(value || "").trim().toLowerCase() === "zh" ? "zh" : "en";
}

async function resolveCustomerLanguage(
  customerEmail?: string | null,
  fallback?: unknown,
): Promise<PreferredLanguage> {
  const fallbackLanguage = normalizePreferredLanguage(fallback);

  if (!customerEmail) return fallbackLanguage;

  const [{ data: profileRow }, { data: userRow }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("preferred_language")
      .eq("email", customerEmail)
      .maybeSingle(),
    adminClient
      .from("users")
      .select("preferred_language")
      .eq("email", customerEmail)
      .maybeSingle(),
  ]);

  return normalizePreferredLanguage(
    profileRow?.preferred_language ||
      userRow?.preferred_language ||
      fallbackLanguage,
  );
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getNumber(value: unknown) {
  return Number(value || 0);
}

export async function processEmailJob(job: EmailJobRow) {
  const payload = job.payload || {};

  /**
   * ---------------------------------------------------------
   * BOOKING CREATED - CUSTOMER
   * ---------------------------------------------------------
   */
  if (job.type === "booking_created_customer") {
    await sendBookingCreatedEmails({
      customerEmail: getNullableString(payload.customerEmail),
      customerLanguage: await resolveCustomerLanguage(
        getNullableString(payload.customerEmail),
        payload.customerLanguage,
      ),
      customerName: getString(payload.customerName) || "Customer",

      supplierEmail: null,
      adminEmail: null,

      restaurantName:
        getString(payload.restaurantName) || "Restaurant",

      bookingCode: getString(payload.bookingCode),
      bookingDate: getString(payload.bookingDate),
      bookingTime: getString(payload.bookingTime),

      guests: getNumber(payload.guests) || 1,

      phone: getNullableString(payload.phone),
      whatsapp: getNullableString(payload.whatsapp),
    });

    return;
  }

  /**
   * ---------------------------------------------------------
   * BOOKING CREATED - SUPPLIER
   * ---------------------------------------------------------
   */
  if (job.type === "booking_created_supplier") {
    await sendBookingCreatedEmails({
      customerEmail: null,
      customerLanguage: normalizePreferredLanguage(payload.customerLanguage),
      customerName: getString(payload.customerName) || "Customer",

      supplierEmail: getNullableString(payload.supplierEmail),
      adminEmail: null,

      restaurantName:
        getString(payload.restaurantName) || "Restaurant",

      bookingCode: getString(payload.bookingCode),
      bookingDate: getString(payload.bookingDate),
      bookingTime: getString(payload.bookingTime),

      guests: getNumber(payload.guests) || 1,

      phone: getNullableString(payload.phone),
      whatsapp: getNullableString(payload.whatsapp),
    });

    return;
  }

  /**
   * ---------------------------------------------------------
   * BOOKING CREATED - ADMIN
   * ---------------------------------------------------------
   */
  if (job.type === "booking_created_admin") {
    await sendBookingCreatedEmails({
      customerEmail: null,
      customerName: getString(payload.customerName) || "Customer",

      supplierEmail: null,
      adminEmail: getNullableString(payload.adminEmail),

      restaurantName:
        getString(payload.restaurantName) || "Restaurant",

      bookingCode: getString(payload.bookingCode),
      bookingDate: getString(payload.bookingDate),
      bookingTime: getString(payload.bookingTime),

      guests: getNumber(payload.guests) || 1,

      phone: getNullableString(payload.phone),
      whatsapp: getNullableString(payload.whatsapp),
    });

    return;
  }

  /**
   * ---------------------------------------------------------
   * BOOKING CONFIRMED
   * ---------------------------------------------------------
   */
  if (job.type === "booking_confirmed") {
    await sendBookingConfirmedEmail({
      customerEmail: getNullableString(payload.customerEmail),
      customerLanguage: await resolveCustomerLanguage(
        getNullableString(payload.customerEmail),
        payload.customerLanguage,
      ),

      customerName:
        getString(payload.customerName) || "Customer",

      restaurantName:
        getString(payload.restaurantName) || "Restaurant",

      bookingCode: getString(payload.bookingCode),

      bookingDate: getString(payload.bookingDate),
      bookingTime: getString(payload.bookingTime),
    });

    return;
  }

  /**
   * ---------------------------------------------------------
   * BOOKING COMPLETED
   * ---------------------------------------------------------
   */
  if (job.type === "booking_completed") {
    await sendBookingCompletedEmails({
      customerEmail: getNullableString(payload.customerEmail),
      customerLanguage: await resolveCustomerLanguage(
        getNullableString(payload.customerEmail),
        payload.customerLanguage,
      ),

      supplierEmail: getNullableString(payload.supplierEmail),

      agentEmail: getNullableString(payload.agentEmail),

      adminEmail: getNullableString(payload.adminEmail),

      customerName:
        getString(payload.customerName) || "Customer",

      restaurantName:
        getString(payload.restaurantName) || "Restaurant",

      bookingCode: getString(payload.bookingCode),

      bookingDate: getNullableString(payload.bookingDate),
      bookingTime: getNullableString(payload.bookingTime),
      guests: getNumber(payload.guests) || 1,
      phone: getNullableString(payload.phone),
      whatsapp: getNullableString(payload.whatsapp),

      totalBill: getNumber(payload.totalBill),

      customerDiscountAmount: getNumber(
        payload.customerDiscountAmount,
      ),

      platformCommissionAmount: getNumber(
        payload.platformCommissionAmount,
      ),

      agentCommissionAmount: getNumber(
        payload.agentCommissionAmount,
      ),

      platformNetAmount: getNumber(
        payload.platformNetAmount,
      ),
    });

    return;
  }

  /**
   * ---------------------------------------------------------
   * BOOKING CANCELLED
   * ---------------------------------------------------------
   */
  if (job.type === "booking_cancelled") {
    await sendBookingCancelledEmails({
      customerEmail: getNullableString(payload.customerEmail),
      customerLanguage: await resolveCustomerLanguage(
        getNullableString(payload.customerEmail),
        payload.customerLanguage,
      ),

      supplierEmail: getNullableString(payload.supplierEmail),

      agentEmail: getNullableString(payload.agentEmail),

      adminEmail: getNullableString(payload.adminEmail),

      customerName:
        getString(payload.customerName) || "Customer",

      restaurantName:
        getString(payload.restaurantName) || "Restaurant",

      bookingCode: getString(payload.bookingCode),

      bookingDate: getNullableString(payload.bookingDate),

      bookingTime: getNullableString(payload.bookingTime),

      cancellationReason: getNullableString(
        payload.cancellationReason,
      ),
    });

    return;
  }

  throw new Error(
    `Unsupported email job type: ${job.type}`,
  );
}