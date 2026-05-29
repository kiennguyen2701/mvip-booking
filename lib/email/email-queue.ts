import { adminClient } from "@/lib/supabase/admin";

export type EmailJobType =
  | "booking_created_customer"
  | "booking_created_supplier"
  | "booking_created_admin"
  | "booking_confirmed"
  | "booking_completed"
  | "booking_cancelled";

const DEFAULT_MAX_ATTEMPTS = 5;

type BaseJobInput = {
  type: EmailJobType;
  bookingId: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
  scheduledAt?: string;
};

async function enqueueEmailJob(input: BaseJobInput) {
  const now = new Date().toISOString();

  const { error } = await adminClient.from("email_jobs").upsert(
    {
      type: input.type,
      booking_id: input.bookingId,
      dedupe_key: input.dedupeKey,
      payload: input.payload,
      status: "pending",
      attempts: 0,
      max_attempts: DEFAULT_MAX_ATTEMPTS,
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
  customerLanguage?: "en" | "zh" | null;
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
  restaurantAddress?: string | null;
  googleMapsUrl?: string | null;
}) {
  const basePayload = {
    customerName: payload.customerName,
    customerLanguage: payload.customerLanguage || "en",
    restaurantName: payload.restaurantName,
    restaurantAddress: payload.restaurantAddress || null,
    googleMapsUrl: payload.googleMapsUrl || null,
    bookingCode: payload.bookingCode,
    bookingDate: payload.bookingDate,
    bookingTime: payload.bookingTime,
    guests: payload.guests,
    phone: payload.phone,
    whatsapp: payload.whatsapp,
  };

  const jobs: Promise<void>[] = [];

  if (payload.customerEmail) {
    jobs.push(
      enqueueEmailJob({
        type: "booking_created_customer",
        bookingId: payload.bookingId,
        dedupeKey: `booking_created_customer:${payload.bookingId}`,
        payload: {
          ...basePayload,
          customerEmail: payload.customerEmail,
        },
      }),
    );
  }

  if (payload.supplierEmail) {
    jobs.push(
      enqueueEmailJob({
        type: "booking_created_supplier",
        bookingId: payload.bookingId,
        dedupeKey: `booking_created_supplier:${payload.bookingId}`,
        payload: {
          ...basePayload,
          supplierEmail: payload.supplierEmail,
        },
      }),
    );
  }

  if (payload.adminEmail) {
    jobs.push(
      enqueueEmailJob({
        type: "booking_created_admin",
        bookingId: payload.bookingId,
        dedupeKey: `booking_created_admin:${payload.bookingId}`,
        payload: {
          ...basePayload,
          adminEmail: payload.adminEmail,
        },
      }),
    );
  }

  await Promise.all(jobs);
}

export async function enqueueBookingConfirmedEmailJob(payload: {
  bookingId: string;
  customerEmail?: string | null;
  customerLanguage?: "en" | "zh" | null;
  customerName: string;
  restaurantName: string;
  restaurantAddress?: string | null;
  googleMapsUrl?: string | null;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  guests?: number | null;
}) {
  await enqueueEmailJob({
    type: "booking_confirmed",
    bookingId: payload.bookingId,
    dedupeKey: `booking_confirmed:${payload.bookingId}`,
    payload,
  });
}

export async function enqueueBookingCompletedEmailJob(payload: {
  bookingId: string;
  customerEmail?: string | null;
  customerLanguage?: "en" | "zh" | null;
  supplierEmail?: string | null;
  agentEmail?: string | null;
  adminEmail?: string | null;
  customerName: string;
  restaurantName: string;
  bookingCode: string;
  bookingDate?: string | null;
  bookingTime?: string | null;
  guests?: number | null;
  phone?: string | null;
  whatsapp?: string | null;
  totalBill: number;
  customerDiscountAmount: number;
  platformCommissionAmount: number;
  agentCommissionAmount: number;
  platformNetAmount: number;
}) {
  await enqueueEmailJob({
    type: "booking_completed",
    bookingId: payload.bookingId,
    dedupeKey: `booking_completed:${payload.bookingId}`,
    payload,
  });
}

export async function enqueueBookingCancelledEmailJob(payload: {
  bookingId: string;
  customerEmail?: string | null;
  customerLanguage?: "en" | "zh" | null;
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
  await enqueueEmailJob({
    type: "booking_cancelled",
    bookingId: payload.bookingId,
    dedupeKey: `booking_cancelled:${payload.bookingId}`,
    payload,
  });
}