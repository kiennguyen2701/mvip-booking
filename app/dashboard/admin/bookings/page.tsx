import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import {
  enqueueBookingCancelledEmailJob,
  enqueueBookingCompletedEmailJob,
  enqueueBookingConfirmedEmailJob,
} from "@/lib/email/email-queue";
import {
  AdminBookingsClient,
  type AdminBookingRow,
} from "@/components/dashboard/admin-bookings-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
type FilterStatus = "all" | BookingStatus;

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    success?: string;
    error?: string;
  }>;
};

type BookingRow = {
  id: string;
  booking_code?: string | null;
  customer_name?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  restaurant_id?: string | null;
  supplier_id?: string | null;
  service_name?: string | null;
  agent_id?: string | null;
  status?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  guests?: number | null;
  guest_count?: number | null;
  total_bill?: number | null;
  customer_discount_amount?: number | null;
  platform_commission_amount?: number | null;
  agent_commission_amount?: number | null;
  platform_net_amount?: number | null;
  cancellation_reason?: string | null;
  created_at?: string | null;
  booking_status_logs?: unknown;
};

type RestaurantRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
  supplier_id?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
};

type AgentRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  referral_code?: string | null;
  ref_code?: string | null;
  agent_code?: string | null;
  code?: string | null;
};

function normalizeStatus(status?: string | null): BookingStatus {
  if (status === "confirmed") return "confirmed";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  return "pending";
}

function normalizeFilterStatus(status?: string | null): FilterStatus {
  if (status === "confirmed") return "confirmed";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "pending") return "pending";
  return "all";
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

async function triggerEmailWorker() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com";
    const secret = process.env.CRON_SECRET || process.env.EMAIL_QUEUE_SECRET || "";
    const url = new URL("/api/email/process", siteUrl);

    if (secret) {
      url.searchParams.set("secret", secret);
    }

    await fetch(url.toString(), {
      method: "POST",
      cache: "no-store",
    });
  } catch (error) {
    console.error("TRIGGER_EMAIL_WORKER_ERROR:", error);
  }
}

async function getSupplierEmailForBooking(booking: BookingRow) {
  if (booking.supplier_id) {
    const { data } = await adminClient
      .from("suppliers")
      .select("id, email, login_email")
      .eq("id", booking.supplier_id)
      .maybeSingle();

    return data?.email || data?.login_email || null;
  }

  if (booking.restaurant_id) {
    const { data: restaurant } = await adminClient
      .from("restaurants")
      .select("id, supplier_id")
      .eq("id", booking.restaurant_id)
      .maybeSingle();

    if (restaurant?.supplier_id) {
      const { data } = await adminClient
        .from("suppliers")
        .select("id, email, login_email")
        .eq("id", restaurant.supplier_id)
        .maybeSingle();

      return data?.email || data?.login_email || null;
    }
  }

  return null;
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

async function updateBookingStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  const status = normalizeStatus(String(formData.get("status") || "pending"));
  const totalBill = Number(formData.get("total_bill") || 0);
  const cancellationReason = String(
    formData.get("cancellation_reason") || "",
  ).trim();

  if (!id) {
    redirect("/dashboard/admin/bookings?error=missing_id");
  }

  const { data: currentBooking, error: currentBookingError } = await adminClient
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (currentBookingError || !currentBooking) {
    redirect(
      `/dashboard/admin/bookings?error=${encodeURIComponent(
        currentBookingError?.message || "Booking not found",
      )}`,
    );
  }

  const booking = currentBooking as BookingRow;
  const oldStatus = normalizeStatus(booking.status);

  if (isLockedStatus(oldStatus)) {
    redirect("/dashboard/admin/bookings?error=status_locked");
  }

  if (status === oldStatus) {
    redirect(`/dashboard/admin/bookings?status=${oldStatus}&success=no_change`);
  }

  if (!isValidTransition(oldStatus, status)) {
    redirect("/dashboard/admin/bookings?error=invalid_status_transition");
  }

  if (status === "completed" && (!totalBill || totalBill <= 0)) {
    redirect("/dashboard/admin/bookings?error=missing_total_bill");
  }

  if (status === "cancelled" && !cancellationReason) {
    redirect("/dashboard/admin/bookings?error=missing_cancellation_reason");
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, string | number | null> = {
    status,
  };

  let amounts = calculateCommission(totalBill);

  if (status === "confirmed") {
    updatePayload.confirmed_at = now;
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  if (status === "completed") {
    amounts = calculateCommission(totalBill);

    updatePayload.completed_at = now;
    updatePayload.total_bill = totalBill;
    updatePayload.customer_discount_amount = amounts.customerDiscountAmount;
    updatePayload.platform_commission_amount = amounts.platformCommissionAmount;
    updatePayload.agent_commission_amount = amounts.agentCommissionAmount;
    updatePayload.platform_net_amount = amounts.platformNetAmount;
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  if (status === "cancelled") {
    updatePayload.cancelled_at = now;
    updatePayload.cancellation_reason = cancellationReason;
  }

  const { error } = await adminClient
    .from("bookings")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    redirect(
      `/dashboard/admin/bookings?error=${encodeURIComponent(error.message)}`,
    );
  }

  await adminClient.from("booking_status_logs").insert({
    booking_id: id,
    old_status: oldStatus,
    new_status: status,
    changed_by_role: "admin",
    note:
      status === "completed"
        ? `Admin completed booking. Total bill: ${totalBill}`
        : status === "cancelled"
          ? `Admin cancelled booking. Reason: ${cancellationReason || "-"}`
          : "Admin updated booking status.",
    created_at: now,
  });

  if (oldStatus === "pending" && status === "confirmed") {
    await enqueueBookingConfirmedEmailJob({
      bookingId: id,
      customerEmail: booking.email,
      customerName: booking.customer_name || booking.name || "Customer",
      restaurantName: booking.service_name || "Restaurant",
      bookingCode: booking.booking_code || booking.id,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
    });

    await triggerEmailWorker();
  }

  if (oldStatus === "confirmed" && status === "completed") {
    const [supplierEmail, agentEmail] = await Promise.all([
      getSupplierEmailForBooking(booking),
      getAgentEmail(booking.agent_id),
    ]);

    await enqueueBookingCompletedEmailJob({
      bookingId: booking.id,
      customerEmail: booking.email,
      supplierEmail,
      agentEmail,
      adminEmail: process.env.ADMIN_EMAIL || process.env.EMAIL_TEST_TO || null,
      customerName: booking.customer_name || booking.name || "Customer",
      restaurantName: booking.service_name || "Restaurant",
      bookingCode: booking.booking_code || booking.id,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
      guests: booking.guests || booking.guest_count || 1,
      phone: booking.phone || "",
      whatsapp: booking.whatsapp || "",
      totalBill,
      customerDiscountAmount: amounts.customerDiscountAmount,
      platformCommissionAmount: amounts.platformCommissionAmount,
      agentCommissionAmount: amounts.agentCommissionAmount,
      platformNetAmount: amounts.platformNetAmount,
    }).catch((error: unknown) => {
      console.error("ENQUEUE_ADMIN_COMPLETED_EMAIL_ERROR:", error);
    });

    await triggerEmailWorker();
  }

  if (oldStatus === "confirmed" && status === "cancelled") {
    const [supplierEmail, agentEmail] = await Promise.all([
      getSupplierEmailForBooking(booking),
      getAgentEmail(booking.agent_id),
    ]);

    await enqueueBookingCancelledEmailJob({
      bookingId: id,
      customerEmail: booking.email,
      supplierEmail,
      agentEmail,
      adminEmail: process.env.ADMIN_EMAIL || null,
      customerName: booking.customer_name || booking.name || "Customer",
      restaurantName: booking.service_name || "Restaurant",
      bookingCode: booking.booking_code || booking.id,
      bookingDate: booking.booking_date || "",
      bookingTime: booking.booking_time || "",
      cancellationReason,
    });

    await triggerEmailWorker();
  }

  revalidatePath("/dashboard/admin/bookings");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/supplier/bookings");
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/agent");
  revalidatePath(`/booking/${id}`);

  redirect(`/dashboard/admin/bookings?status=${status}&success=updated`);
}

async function deleteBooking(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  const currentStatus = normalizeFilterStatus(
    String(formData.get("current_status") || "all"),
  );

  if (!id) {
    redirect("/dashboard/admin/bookings?error=missing_id");
  }

  const { error } = await adminClient.from("bookings").delete().eq("id", id);

  if (error) {
    redirect(
      `/dashboard/admin/bookings?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard/admin/bookings");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/supplier/bookings");
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/agent");

  redirect(`/dashboard/admin/bookings?status=${currentStatus}&success=deleted`);
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const initialStatus = normalizeFilterStatus(resolvedSearchParams?.status);

  const { data: allBookingsData, error } = await adminClient
    .from("bookings")
    .select(
      `
      id,
      booking_code,
      customer_name,
      name,
      phone,
      email,
      whatsapp,
      restaurant_id,
      supplier_id,
      service_name,
      agent_id,
      status,
      booking_date,
      booking_time,
      guests,
      guest_count,
      total_bill,
      customer_discount_amount,
      platform_commission_amount,
      agent_commission_amount,
      platform_net_amount,
      cancellation_reason,
      created_at,
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

  const allBookings = ((allBookingsData || []) as BookingRow[]).map(
    (booking) => ({
      ...booking,
      status: normalizeStatus(booking.status),
    }),
  );

  const restaurantIds = Array.from(
    new Set(allBookings.map((item) => item.restaurant_id).filter(Boolean)),
  ) as string[];

  const agentIds = Array.from(
    new Set(allBookings.map((item) => item.agent_id).filter(Boolean)),
  ) as string[];

  const [{ data: restaurantsData }, { data: agentsData }] = await Promise.all([
    restaurantIds.length
      ? adminClient
          .from("restaurants")
          .select("id, name, slug, supplier_id, city, address, phone")
          .in("id", restaurantIds)
      : Promise.resolve({ data: [] }),

    agentIds.length
      ? adminClient
          .from("agents")
          .select("id, name, full_name, email, referral_code, ref_code, agent_code, code")
          .in("id", agentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const restaurants = (restaurantsData || []) as RestaurantRow[];
  const agents = (agentsData || []) as AgentRow[];

  const restaurantMap = new Map(restaurants.map((item) => [item.id, item]));
  const agentMap = new Map(agents.map((item) => [item.id, item]));

  const bookings: AdminBookingRow[] = allBookings.map((booking) => {
    const rawLogs = Array.isArray(booking.booking_status_logs)
      ? booking.booking_status_logs
      : [];

    return {
      ...booking,
      booking_status_logs: rawLogs as AdminBookingRow["booking_status_logs"],
      restaurants: booking.restaurant_id
        ? restaurantMap.get(booking.restaurant_id) || null
        : null,
      agent: booking.agent_id ? agentMap.get(booking.agent_id) || null : null,
    };
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-4 py-5 md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(214,155,56,0.11)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <AdminBookingsClient
        bookings={bookings}
        initialStatus={initialStatus}
        success={resolvedSearchParams?.success}
        error={resolvedSearchParams?.error}
        updateAction={updateBookingStatus}
        deleteAction={deleteBooking}
      />
    </main>
  );
}