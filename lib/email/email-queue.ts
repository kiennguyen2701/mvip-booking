import { adminClient } from "@/lib/supabase/admin";

const DEFAULT_MAX_ATTEMPTS = 5;

async function createEmailJob(input: {
  bookingId: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  const dedupeKey = `${input.type}:${input.bookingId}`;

  const { error } = await adminClient.from("email_jobs").insert({
    booking_id: input.bookingId,
    type: input.type,
    payload: input.payload,
    dedupe_key: dedupeKey,
    status: "pending",
    attempts: 0,
    max_attempts: DEFAULT_MAX_ATTEMPTS,
    scheduled_at: new Date().toISOString(),
  });

  if (error) {
    console.error("CREATE_EMAIL_JOB_ERROR:", error);
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
  const basePayload = {
    customerName: payload.customerName,
    restaurantName: payload.restaurantName,
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
      createEmailJob({
        bookingId: payload.bookingId,
        type: "booking_created_customer",
        payload: {
          ...basePayload,
          customerEmail: payload.customerEmail,
        },
      }),
    );
  }

  if (payload.supplierEmail) {
    jobs.push(
      createEmailJob({
        bookingId: payload.bookingId,
        type: "booking_created_supplier",
        payload: {
          ...basePayload,
          supplierEmail: payload.supplierEmail,
        },
      }),
    );
  }

  if (payload.adminEmail) {
    jobs.push(
      createEmailJob({
        bookingId: payload.bookingId,
        type: "booking_created_admin",
        payload: {
          ...basePayload,
          adminEmail: payload.adminEmail,
        },
      }),
    );
  }

  await Promise.all(jobs);
}