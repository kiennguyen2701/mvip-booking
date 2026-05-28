// app/dashboard/admin/bookings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import {
  enqueueBookingConfirmedEmailJob,
  enqueueBookingCompletedEmailJob,
  enqueueBookingCancelledEmailJob,
} from "@/lib/email/email-queue";
import { processEmailJobsForBooking } from "@/lib/email/process-email-jobs-helper";

async function ensureAdmin() {
  const current = await requireAuth();
  if (current.profile?.role !== "admin") throw new Error("Unauthorized");
  return current;
}

function calculateAmounts(totalBill: number) {
  return {
    customerDiscountAmount: totalBill * 0.05,
    platformCommissionAmount: totalBill * 0.1,
    agentCommissionAmount: totalBill * 0.05,
    platformNetAmount: totalBill * 0.05,
  };
}

export async function updateBookingStatus(formData: FormData): Promise<void> {
  await ensureAdmin();

  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const cancellationReason = String(
    formData.get("cancellation_reason") || "",
  ).trim();
  const totalBill = Number(formData.get("total_bill") || 0);

  if (!id) redirect("/dashboard/admin/bookings?error=missing_id");

  if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) {
    redirect("/dashboard/admin/bookings?error=invalid_status");
  }

  // Đọc booking hiện tại để lấy email, tên, old status
  const { data: booking, error: fetchError } = await adminClient
    .from("bookings")
    .select(
      `id, booking_code, status, customer_name, email, phone, whatsapp,
       service_name, agent_id, booking_date, booking_time,
       guests, guest_count, supplier_id,
       total_bill, customer_discount_amount,
       platform_commission_amount, agent_commission_amount, platform_net_amount`,
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !booking) {
    redirect("/dashboard/admin/bookings?error=booking_not_found");
  }

  const oldStatus = booking.status as string;
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: now,
  };

  if (status === "confirmed") {
    updatePayload.confirmed_at = now;
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  if (status === "completed") {
    const amounts = calculateAmounts(totalBill || Number(booking.total_bill) || 0);
    const bill = totalBill || Number(booking.total_bill) || 0;
    updatePayload.completed_at = now;
    updatePayload.total_bill = bill;
    updatePayload.customer_discount_amount = amounts.customerDiscountAmount;
    updatePayload.platform_commission_amount = amounts.platformCommissionAmount;
    updatePayload.agent_commission_amount = amounts.agentCommissionAmount;
    updatePayload.platform_net_amount = amounts.platformNetAmount;
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  if (status === "cancelled") {
    updatePayload.cancelled_at = now;
    updatePayload.cancellation_reason = cancellationReason || null;
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

  // Log status change
  await adminClient.from("booking_status_logs").insert({
    booking_id: id,
    old_status: oldStatus,
    new_status: status,
    changed_by_role: "admin",
    note:
      status === "cancelled"
        ? `Admin cancelled. Reason: ${cancellationReason || "-"}`
        : `Admin changed status to ${status}.`,
    created_at: now,
  });

  // Gửi email nếu status thay đổi
  if (oldStatus !== status) {
    try {
      // Lấy supplier email và agent email
      const [supplierResult, agentResult] = await Promise.all([
        booking.supplier_id
          ? adminClient
              .from("suppliers")
              .select("email, login_email")
              .eq("id", booking.supplier_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        booking.agent_id
          ? adminClient
              .from("agents")
              .select("email")
              .eq("id", booking.agent_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const supplierEmail =
        supplierResult.data?.email ||
        supplierResult.data?.login_email ||
        null;
      const agentEmail = agentResult.data?.email || null;

      const customerName = booking.customer_name || "Customer";
      const restaurantName = booking.service_name || "Restaurant";
      const bookingCode = booking.booking_code || id;

      if (status === "confirmed") {
        await enqueueBookingConfirmedEmailJob({
          bookingId: id,
          customerEmail: booking.email,
          customerName,
          restaurantName,
          bookingCode,
          bookingDate: booking.booking_date || "",
          bookingTime: booking.booking_time || "",
        });
      }

      if (status === "completed") {
        const bill = totalBill || Number(booking.total_bill) || 0;
        const amounts = calculateAmounts(bill);

        await enqueueBookingCompletedEmailJob({
          bookingId: id,
          customerEmail: booking.email,
          supplierEmail,
          agentEmail,
          adminEmail: process.env.ADMIN_EMAIL || null,
          customerName,
          restaurantName,
          bookingCode,
          bookingDate: booking.booking_date || "",
          bookingTime: booking.booking_time || "",
          guests: booking.guests || booking.guest_count || 1,
          phone: booking.phone || "",
          whatsapp: booking.whatsapp || "",
          totalBill: bill,
          customerDiscountAmount: amounts.customerDiscountAmount,
          platformCommissionAmount: amounts.platformCommissionAmount,
          agentCommissionAmount: amounts.agentCommissionAmount,
          platformNetAmount: amounts.platformNetAmount,
        });
      }

      if (status === "cancelled") {
        await enqueueBookingCancelledEmailJob({
          bookingId: id,
          customerEmail: booking.email,
          supplierEmail,
          agentEmail,
          adminEmail: process.env.ADMIN_EMAIL || null,
          customerName,
          restaurantName,
          bookingCode,
          bookingDate: booking.booking_date || "",
          bookingTime: booking.booking_time || "",
          cancellationReason: cancellationReason || null,
        });
      }

      // Process ngay — không HTTP fetch, tránh Vercel Hobby timeout
      await processEmailJobsForBooking(id);
    } catch (emailError) {
      console.error("ADMIN_STATUS_EMAIL_ERROR:", emailError);
      // Không throw — booking đã update thành công, email lỗi không block
    }
  }

  revalidatePath("/dashboard/admin/bookings");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/supplier");
  revalidatePath("/dashboard/agent");

  redirect("/dashboard/admin/bookings?success=updated");
}

export async function deleteBooking(formData: FormData): Promise<void> {
  await ensureAdmin();

  const id = String(formData.get("id") || "").trim();
  if (!id) redirect("/dashboard/admin/bookings?error=missing_id");

  const { error } = await adminClient.from("bookings").delete().eq("id", id);

  if (error) {
    redirect(
      `/dashboard/admin/bookings?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard/admin/bookings");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/supplier");
  revalidatePath("/dashboard/agent");

  redirect("/dashboard/admin/bookings?success=deleted");
}