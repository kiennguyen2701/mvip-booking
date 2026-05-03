import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sendBookingCreatedEmails } from "@/lib/email/send-booking-emails";

export const dynamic = "force-dynamic";

type AgentRow = {
  id: string;
  referral_code?: string | null;
  ref_code?: string | null;
  agent_code?: string | null;
  code?: string | null;
};

function generateBookingCode() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MVIP-${ymd}-${random}`;
}

function getAgentCode(agent: AgentRow) {
  return (
    agent.referral_code ||
    agent.ref_code ||
    agent.agent_code ||
    agent.code ||
    ""
  );
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
    const restaurantName = String(body.restaurantName || "Restaurant").trim();
    const supplierId = String(body.supplierId || "").trim();

    const customerName = String(body.customerName || "").trim();
    const phone = String(body.phone || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();

    const guests = Number(body.guests || 1);
    const bookingDate = String(body.bookingDate || "").trim();
    const bookingTime = String(body.bookingTime || "").trim();
    const agentRef = String(body.agentRef || "").trim();

    if (!restaurantId || !customerName || !phone || !bookingDate || !bookingTime) {
      return NextResponse.json(
        { error: "Missing required booking information." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(guests) || guests < 1) {
      return NextResponse.json(
        { error: "Invalid number of guests." },
        { status: 400 },
      );
    }

    let agentId: string | null = null;

    if (agentRef) {
      const { data: agents, error: agentsError } = await adminClient
        .from("agents")
        .select("id, referral_code, ref_code, agent_code, code");

      if (agentsError) {
        return NextResponse.json(
          { error: agentsError.message },
          { status: 400 },
        );
      }

      const matchedAgent = (agents || []).find((agent) => {
        return getAgentCode(agent as AgentRow) === agentRef;
      }) as AgentRow | undefined;

      agentId = matchedAgent?.id || null;
    }

    const bookingCode = generateBookingCode();
    const now = new Date().toISOString();

    const { data: supplier } = supplierId
      ? await adminClient
          .from("suppliers")
          .select("id, name, email")
          .eq("id", supplierId)
          .maybeSingle()
      : { data: null };

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

        supplier_note: agentRef ? `Agent ref: ${agentRef}` : null,
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

    const { error: logError } = await adminClient
      .from("booking_status_logs")
      .insert({
        booking_id: booking.id,
        old_status: null,
        new_status: "pending",
        note: "Customer created restaurant booking.",
        created_at: now,
      });

    if (logError) {
      console.error("BOOKING_STATUS_LOG_ERROR:", logError.message);
    }

    sendBookingCreatedEmails({
      customerEmail: user.email,
      customerName,
      supplierEmail: supplier?.email || null,
      restaurantName,
      bookingCode,
      bookingDate,
      bookingTime,
      guests,
      phone,
      whatsapp,
    }).catch((error) => {
      console.error("SEND_BOOKING_CREATED_EMAILS_ERROR:", error);
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
    });
  } catch (error) {
    console.error("CREATE_BOOKING_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to create booking." },
      { status: 500 },
    );
  }
}