import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { enqueueBookingCreatedEmailJob } from "@/lib/email/email-queue";
import { processEmailJob } from "@/lib/email/process-email-job";
import { deleteCache, deleteCacheByPattern } from "@/lib/cache/cache";
import { cacheKeys, cachePatterns } from "@/lib/cache/keys";
import { requireUser } from "@/lib/auth/guards";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

type PreferredLanguage = "en" | "zh";

function normalizePreferredLanguage(value: unknown): PreferredLanguage {
  return String(value || "").trim().toLowerCase() === "zh" ? "zh" : "en";
}

function generateBookingCode() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MVIP-${ymd}-${random}`;
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidBookingTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

async function getCustomerAgent(userId: string) {
  const { data: userRow } = await adminClient
    .from("users")
    .select("agent_id, ref_code")
    .eq("id", userId)
    .maybeSingle();

  if (userRow?.agent_id) {
    return {
      agentId: String(userRow.agent_id),
      refCode: String(userRow.ref_code || ""),
    };
  }

  const { data: profileRow } = await adminClient
    .from("profiles")
    .select("referred_by_agent_id, referred_by_ref_code")
    .eq("id", userId)
    .maybeSingle();

  if (profileRow?.referred_by_agent_id) {
    return {
      agentId: String(profileRow.referred_by_agent_id),
      refCode: String(profileRow.referred_by_ref_code || ""),
    };
  }

  return { agentId: null as string | null, refCode: "" };
}

// FIX: Nhận jobs trực tiếp từ DB sau khi enqueue — tránh race condition
// và tránh HTTP fetch same-origin bị block trên Vercel Hobby.
async function processJobsById(jobIds: string[]) {
  if (!jobIds.length) return;

  console.log("PROCESS_JOBS_START:", jobIds);

  for (const jobId of jobIds) {
    try {
      // Lock job
      const { data: locked } = await adminClient
        .from("email_jobs")
        .update({
          status: "processing",
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .neq("status", "sent")
        .select("id, type, payload, attempts, max_attempts")
        .maybeSingle();

      if (!locked) {
        console.log("PROCESS_JOBS_SKIP:", jobId, "already sent or locked");
        continue;
      }

      console.log("PROCESS_JOBS_PROCESSING:", jobId, locked.type);

      await processEmailJob({
        id: locked.id,
        type: String(locked.type),
        payload: (locked.payload || {}) as Record<string, unknown>,
      });

      await adminClient
        .from("email_jobs")
        .update({
          status: "sent",
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", jobId);

      console.log("PROCESS_JOBS_SENT:", jobId);
    } catch (error) {
      console.error("PROCESS_JOBS_ERROR:", jobId, error);

      // Lấy attempts hiện tại để tính retry
      const { data: currentJob } = await adminClient
        .from("email_jobs")
        .select("attempts, max_attempts")
        .eq("id", jobId)
        .maybeSingle();

      const attempts = Number(currentJob?.attempts || 0) + 1;
      const maxAttempts = Number(currentJob?.max_attempts || 5);
      const finalFailed = attempts >= maxAttempts;

      await adminClient
        .from("email_jobs")
        .update({
          status: finalFailed ? "failed" : "pending",
          attempts,
          updated_at: new Date().toISOString(),
          last_error: error instanceof Error ? error.message : "Unknown error",
          locked_at: null,
        })
        .eq("id", jobId);
    }
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const clientIp = getClientIp(request);

    const [ipLimit, userLimit] = await Promise.all([
      rateLimit({
        key: `booking:create:ip:${clientIp}`,
        limit: 30,
        windowMs: 60 * 60 * 1000,
      }),
      rateLimit({
        key: `booking:create:user:${user.id}`,
        limit: 12,
        windowMs: 10 * 60 * 1000,
      }),
    ]);

    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many booking requests. Please try again later." },
        { status: 429 },
      );
    }

    if (!userLimit.success) {
      return NextResponse.json(
        { error: "Too many booking requests. Please wait before trying again." },
        { status: 429 },
      );
    }

    const body = await request.json();

    const restaurantId = String(body.restaurantId || "").trim();
    const customerName = String(body.customerName || "").trim();
    const phone = String(body.phone || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();
    const guests = Number(body.guests || 1);
    const bookingDate = String(body.bookingDate || "").trim();
    const bookingTime = String(body.bookingTime || "").trim();

    if (!restaurantId || !customerName || !phone || !bookingDate || !bookingTime) {
      return NextResponse.json(
        { error: "Missing required booking information." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
      return NextResponse.json(
        { error: "Invalid guest count." },
        { status: 400 },
      );
    }

    if (bookingDate < getTodayInputValue()) {
      return NextResponse.json(
        { error: "Booking date cannot be in the past." },
        { status: 400 },
      );
    }

    if (!isValidBookingTime(bookingTime)) {
      return NextResponse.json(
        { error: "Invalid booking time." },
        { status: 400 },
      );
    }

    const { data: restaurant, error: restaurantError } = await adminClient
      .from("restaurants")
      .select("id, name, supplier_id, is_active")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 },
      );
    }

    if (restaurant.is_active === false) {
      return NextResponse.json(
        { error: "This restaurant is not available for booking." },
        { status: 403 },
      );
    }

    const supplierId = String(restaurant.supplier_id || "").trim();

    const { data: supplier } = supplierId
      ? await adminClient
          .from("suppliers")
          .select("id, name, company_name, email, login_email")
          .eq("id", supplierId)
          .maybeSingle()
      : { data: null };

    const { agentId, refCode } = await getCustomerAgent(user.id);

    const [{ data: profileLanguageRow }, { data: userLanguageRow }] =
      await Promise.all([
        adminClient
          .from("profiles")
          .select("preferred_language")
          .eq("id", user.id)
          .maybeSingle(),
        adminClient
          .from("users")
          .select("preferred_language")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

    const customerLanguage = normalizePreferredLanguage(
      profileLanguageRow?.preferred_language ||
        userLanguageRow?.preferred_language ||
        user.user_metadata?.preferred_language,
    );

    const bookingCode = generateBookingCode();
    const now = new Date().toISOString();

    const restaurantName =
      restaurant?.name ||
      supplier?.company_name ||
      supplier?.name ||
      String(body.restaurantName || "Restaurant");

    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .insert({
        booking_code: bookingCode,
        customer_name: customerName,
        phone,
        whatsapp: whatsapp || null,
        email: user.email || null,
        restaurant_id: restaurantId,
        service_name: restaurantName,
        supplier_id: supplierId || null,
        agent_id: agentId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        guests,
        guest_count: guests,
        customer_language: customerLanguage,
        status: "pending",
        total_bill: 0,
        customer_discount_amount: 0,
        platform_commission_amount: 0,
        agent_commission_amount: 0,
        platform_net_amount: 0,
        supplier_note: refCode ? `Agent ref: ${refCode}` : null,
        created_at: now,
      })
      .select("id")
      .single();

    if (bookingError) {
      return NextResponse.json(
        { error: bookingError.message },
        { status: 400 },
      );
    }

    await adminClient.from("booking_status_logs").insert({
      booking_id: booking.id,
      old_status: null,
      new_status: "pending",
      changed_by_role: "customer",
      note: "Customer created restaurant booking.",
      created_at: now,
    });

    const supplierEmail = supplier?.email || supplier?.login_email || null;

    // Enqueue rồi lấy job IDs để process trực tiếp — không query lại DB
    try {
      const jobIds = await enqueueAndGetJobIds({
        bookingId: booking.id,
        customerEmail: user.email || null,
        customerLanguage,
        customerName,
        supplierEmail,
        adminEmail: process.env.ADMIN_EMAIL || null,
        restaurantName,
        bookingCode,
        bookingDate,
        bookingTime,
        guests,
        phone,
        whatsapp,
      });

      // Process ngay trong cùng request — không HTTP fetch
      await processJobsById(jobIds);
    } catch (error) {
      console.error("BOOKING_EMAIL_ERROR:", error);
    }

    if (supplierId) {
      await deleteCache(cacheKeys.supplierDashboard(supplierId));
    }

    await deleteCacheByPattern(cachePatterns.publicRestaurants());

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingCode,
    });
  } catch (error) {
    console.error("CREATE_BOOKING_ERROR:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Please sign in before creating a booking." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Unable to create booking." },
      { status: 500 },
    );
  }
}

// Enqueue và trả về job IDs ngay lập tức — tránh query lại DB
async function enqueueAndGetJobIds(payload: {
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
}): Promise<string[]> {
  const basePayload = {
    customerName: payload.customerName,
    customerLanguage: payload.customerLanguage || "en",
    restaurantName: payload.restaurantName,
    bookingCode: payload.bookingCode,
    bookingDate: payload.bookingDate,
    bookingTime: payload.bookingTime,
    guests: payload.guests,
    phone: payload.phone,
    whatsapp: payload.whatsapp,
  };

  const now = new Date().toISOString();

  type JobInsert = {
    type: string;
    booking_id: string;
    dedupe_key: string;
    payload: Record<string, unknown>;
    status: string;
    attempts: number;
    max_attempts: number;
    scheduled_at: string;
    updated_at: string;
  };

  const jobs: JobInsert[] = [];

  if (payload.customerEmail) {
    jobs.push({
      type: "booking_created_customer",
      booking_id: payload.bookingId,
      dedupe_key: `booking_created_customer:${payload.bookingId}`,
      payload: { ...basePayload, customerEmail: payload.customerEmail },
      status: "pending",
      attempts: 0,
      max_attempts: 5,
      scheduled_at: now,
      updated_at: now,
    });
  }

  if (payload.supplierEmail) {
    jobs.push({
      type: "booking_created_supplier",
      booking_id: payload.bookingId,
      dedupe_key: `booking_created_supplier:${payload.bookingId}`,
      payload: { ...basePayload, supplierEmail: payload.supplierEmail },
      status: "pending",
      attempts: 0,
      max_attempts: 5,
      scheduled_at: now,
      updated_at: now,
    });
  }

  if (payload.adminEmail) {
    jobs.push({
      type: "booking_created_admin",
      booking_id: payload.bookingId,
      dedupe_key: `booking_created_admin:${payload.bookingId}`,
      payload: { ...basePayload, adminEmail: payload.adminEmail },
      status: "pending",
      attempts: 0,
      max_attempts: 5,
      scheduled_at: now,
      updated_at: now,
    });
  }

  if (!jobs.length) return [];

  const { data, error } = await adminClient
    .from("email_jobs")
    .upsert(jobs, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error("ENQUEUE_JOBS_ERROR:", error.message);
    throw error;
  }

  return (data || []).map((row: { id: string }) => row.id);
}