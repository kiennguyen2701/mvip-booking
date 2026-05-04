import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sendBookingCreatedEmails } from "@/lib/email/send-booking-emails";

export const dynamic = "force-dynamic";

function generateBookingCode() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MVIP-${ymd}-${random}`;
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

  return {
    agentId: null as string | null,
    refCode: "",
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in before creating a booking." },
        { status: 401 },
      );
    }

    const body = await request.json();

    const restaurantId = String(body.restaurantId || "").trim();
    const supplierIdFromBody = String(body.supplierId || "").trim();

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

    const { data: restaurant } = await adminClient
      .from("restaurants")
      .select("id, name, supplier_id")
      .eq("id", restaurantId)
      .maybeSingle();

    const supplierId =
      supplierIdFromBody || String(restaurant?.supplier_id || "").trim();

    const { data: supplier } = supplierId
      ? await adminClient
          .from("suppliers")
          .select("id, name, company_name, email, login_email")
          .eq("id", supplierId)
          .maybeSingle()
      : { data: null };

    const { agentId, refCode } = await getCustomerAgent(user.id);

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

    console.log("BOOKING_EMAIL_RECIPIENTS:", {
      customerEmail: user.email || null,
      supplierEmail,
      adminEmail: process.env.ADMIN_EMAIL || null,
      bookingCode,
    });

    await sendBookingCreatedEmails({
      customerEmail: user.email || null,
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

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingCode,
    });
  } catch (error) {
    console.error("CREATE_BOOKING_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to create booking." },
      { status: 500 },
    );
  }
}