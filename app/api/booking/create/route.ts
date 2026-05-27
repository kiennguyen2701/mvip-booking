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

// FIX: Gọi processEmailJob trực tiếp thay vì fetch internal URL.
// Vercel Hobby plan không cho serverless function tự gọi chính nó (same-origin fetch bị block).
// Gọi trực tiếp: nhanh hơn, không tốn extra round-trip, không bị Unauthorized.
async function processJobsDirectly(bookingId: string) {
  try {
    const { data: jobs } = await adminClient
      .from("email_jobs")
      .select("id, type, payload, status, attempts, max_attempts")
      .eq("booking_id", bookingId)
      .eq("status", "pending")
      .limit(10);

    if (!jobs?.length) return;

    for (const job of jobs) {
      // Lock job trước khi process
      const { data: locked } = await adminClient
        .from("email_jobs")
        .update({
          status: "processing",
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .neq("status", "sent")
        .select("id")
        .maybeSingle();

      if (!locked) continue;

      try {
        await processEmailJob({
          id: job.id,
          type: String(job.type),
          payload: (job.payload || {}) as Record<string, unknown>,
        });

        await adminClient
          .from("email_jobs")
          .update({
            status: "sent",
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", job.id);
      } catch (error) {
        const attempts = Number(job.attempts || 0) + 1;
        const maxAttempts = Number(job.max_attempts || 5);
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
          .eq("id", job.id);

        console.error("EMAIL_JOB_PROCESS_ERROR:", job.id, error);
      }
    }
  } catch (error) {
    console.error("PROCESS_JOBS_DIRECTLY_ERROR:", error);
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

    try {
      await enqueueBookingCreatedEmailJob({
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

      // Gọi trực tiếp thay vì fetch internal URL
      await processJobsDirectly(booking.id);
    } catch (error) {
      console.error("BOOKING_CREATED_EMAIL_ERROR:", error);
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