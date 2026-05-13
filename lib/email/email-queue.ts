import { adminClient } from "@/lib/supabase/admin";

export type EmailJobType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_completed"
  | "booking_cancelled";

type BaseJobInput = {
  type: EmailJobType;
  bookingId?: string | null;
  dedupeKey: string;
  payload: Record<string, unknown>;
  scheduledAt?: string;
};

async function enqueueEmailJob(input: BaseJobInput) {
  const now = new Date().toISOString();

  const { error } = await adminClient.from("email_jobs").upsert(
    {
      type: input.type,
      booking_id: input.bookingId || null,
      dedupe_key: input.dedupeKey,
      payload: input.payload,
      status: "pending",
      scheduled_at: input.scheduledAt || now,
      updated_at: now,
    },
    {
      onConflict: "dedupe_key",
      ignoreDuplicates: true,
    },
  );

  if (error) {
    console.error("ENQUEUE_EMAIL_JOB_ERROR:", error.message);
    throw error;
  }
}

export async function enqueueBookingCreatedEmailJob(payload: {
  bookingId: string;
  customerEmail?: string | null;
  customerName: string;
  supplierEmail?: string | null;
  adminEmail?: string | null;
  restaurantName: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  guests: number;
  phone?: string | null;
  whatsapp?: string | null;
}) {
  return enqueueEmailJob({
    type: "booking_created",
    bookingId: payload.bookingId,
    dedupeKey: `booking_created:${payload.bookingId}`,
    payload,
  });
}

export async function enqueueBookingConfirmedEmailJob(payload: {
  bookingId: string;
  customerEmail?: string | null;
  customerName: string;
  restaurantName: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
}) {
  return enqueueEmailJob({
    type: "booking_confirmed",
    bookingId: payload.bookingId,
    dedupeKey: `booking_confirmed:${payload.bookingId}`,
    payload,
  });
}

export async function enqueueBookingCompletedEmailJob(payload: {
  bookingId: string;
  customerEmail?: string | null;
  supplierEmail?: string | null;
  agentEmail?: string | null;
  adminEmail?: string | null;
  customerName: string;
  restaurantName: string;
  bookingCode: string;
  totalBill: number;
  customerDiscountAmount: number;
  platformCommissionAmount: number;
  agentCommissionAmount: number;
  platformNetAmount: number;
}) {
  return enqueueEmailJob({
    type: "booking_completed",
    bookingId: payload.bookingId,
    dedupeKey: `booking_completed:${payload.bookingId}`,
    payload,
  });
}

export async function enqueueBookingCancelledEmailJob(payload: {
  bookingId: string;
  customerEmail?: string | null;
  supplierEmail?: string | null;
  agentEmail?: string | null;
  adminEmail?: string | null;
  customerName: string;
  restaurantName: string;
  bookingCode: string;
  bookingDate?: string | null;
  bookingTime?: string | null;
  cancellationReason?: string | null;
}) {
  return enqueueEmailJob({
    type: "booking_cancelled",
    bookingId: payload.bookingId,
    dedupeKey: `booking_cancelled:${payload.bookingId}`,
    payload,
  });
}