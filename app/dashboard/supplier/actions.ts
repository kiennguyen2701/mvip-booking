"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSupplier } from "@/lib/suppliers/get-current-supplier";
import {
  enqueueBookingCancelledEmailJob,
  enqueueBookingCompletedEmailJob,
  enqueueBookingConfirmedEmailJob,
} from "@/lib/email/email-queue";
import { deleteCache } from "@/lib/cache/cache";
import { cacheKeys } from "@/lib/cache/keys";

export type SupplierActionState = {
  success: boolean;
  message: string;
};

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

function calculateAmounts(totalBill: number) {
  return {
    customer_discount_amount: totalBill * 0.05,
    platform_commission_amount: totalBill * 0.1,
    agent_commission_amount: totalBill * 0.05,
    platform_net_amount: totalBill * 0.05,
  };
}

function getStringValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function changeSupplierPassword(formData: FormData): Promise<void> {
  await getCurrentSupplier();

  const supabase = await createClient();

  const currentPassword = getStringValue(formData, "currentPassword");
  const newPassword = getStringValue(formData, "newPassword");
  const confirmPassword = getStringValue(formData, "confirmPassword");

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/dashboard/supplier/change-password?error=missing_fields");
  }

  if (newPassword.length < 8) {
    redirect("/dashboard/supplier/change-password?error=password_too_short");
  }

  if (newPassword !== confirmPassword) {
    redirect("/dashboard/supplier/change-password?error=password_not_match");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/dashboard/supplier/change-password?error=user_not_found");
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    redirect("/dashboard/supplier/change-password?error=current_password_wrong");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    redirect(
      `/dashboard/supplier/change-password?error=${encodeURIComponent(
        updateError.message,
      )}`,
    );
  }

  revalidatePath("/dashboard/supplier/change-password");
  redirect("/dashboard/supplier/change-password?success=changed");
}

export async function updateSupplierBookingStatus(
  _prevState: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  try {
    const { supplier } = await getCurrentSupplier();

    const bookingId = String(formData.get("bookingId") || "").trim();
    const status = String(formData.get("status") || "").trim() as BookingStatus;
    const supplierNote = String(formData.get("supplierNote") || "").trim();
    const cancellationReason = String(
      formData.get("cancellationReason") || "",
    ).trim();
    const totalBill = Number(formData.get("totalBill") || 0);

    if (!bookingId) {
      return { success: false, message: "Missing booking ID." };
    }

    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      return { success: false, message: "Invalid booking status." };
    }

    if (status === "cancelled" && !cancellationReason) {
      return {
        success: false,
        message: "Please enter a cancellation reason.",
      };
    }

    if (
      (status === "confirmed" || status === "completed") &&
      (!Number.isFinite(totalBill) || totalBill < 0)
    ) {
      return {
        success: false,
        message: "Invalid total bill.",
      };
    }

    const { data: currentBooking, error: currentBookingError } =
      await adminClient
        .from("bookings")
        .select(
          `
          id,
          booking_code,
          status,
          customer_name,
          phone,
          whatsapp,
          email,
          service_name,
          supplier_id,
          agent_id,
          booking_date,
          booking_time,
          guests,
          total_bill
        `,
        )
        .eq("id", bookingId)
        .eq("supplier_id", supplier.id)
        .maybeSingle();

    if (currentBookingError) {
      return { success: false, message: currentBookingError.message };
    }

    if (!currentBooking) {
      return {
        success: false,
        message: "Booking not found or not allowed.",
      };
    }

    const oldStatus = currentBooking.status as BookingStatus;
    const now = new Date().toISOString();

    const amountFields =
      status === "completed" || status === "confirmed"
        ? calculateAmounts(totalBill)
        : {
            customer_discount_amount: 0,
            platform_commission_amount: 0,
            agent_commission_amount: 0,
            platform_net_amount: 0,
          };

    const updatePayload: Record<string, unknown> = {
      status,
      supplier_note: supplierNote || null,
      total_bill:
        status === "confirmed" || status === "completed" ? totalBill : 0,
      customer_discount_amount: amountFields.customer_discount_amount,
      platform_commission_amount: amountFields.platform_commission_amount,
      agent_commission_amount: amountFields.agent_commission_amount,
      platform_net_amount: amountFields.platform_net_amount,
      updated_at: now,
    };

    if (status === "confirmed") {
      updatePayload.confirmed_at = now;
      updatePayload.cancelled_at = null;
      updatePayload.cancellation_reason = null;
    }

    if (status === "completed") {
      updatePayload.completed_at = now;
      updatePayload.cancelled_at = null;
      updatePayload.cancellation_reason = null;
    }

    if (status === "cancelled") {
      updatePayload.cancelled_at = now;
      updatePayload.cancellation_reason = cancellationReason;
    }

    const { error: updateError } = await adminClient
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId)
      .eq("supplier_id", supplier.id);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    await adminClient.from("booking_status_logs").insert({
      booking_id: bookingId,
      old_status: oldStatus,
      new_status: status,
      changed_by_role: "supplier",
      note:
        status === "cancelled"
          ? cancellationReason
          : supplierNote || `Supplier changed status to ${status}.`,
      created_at: now,
    });

    await deleteCache(cacheKeys.supplierDashboard(supplier.id));

    const [{ data: supplierEmailRow }, { data: agentRow }] = await Promise.all([
      adminClient
        .from("suppliers")
        .select("id, email, login_email")
        .eq("id", supplier.id)
        .maybeSingle(),

      currentBooking.agent_id
        ? adminClient
            .from("agents")
            .select("id, email")
            .eq("id", currentBooking.agent_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const supplierEmail =
      supplierEmailRow?.email || supplierEmailRow?.login_email || null;
    const agentEmail = agentRow?.email || null;

    if (oldStatus !== status && status === "confirmed") {
      enqueueBookingConfirmedEmailJob({
        bookingId,
        customerEmail: currentBooking.email,
        customerName: currentBooking.customer_name || "Customer",
        restaurantName: currentBooking.service_name || "Restaurant",
        bookingCode: currentBooking.booking_code || bookingId,
        bookingDate: currentBooking.booking_date || "",
        bookingTime: currentBooking.booking_time || "",
      }).catch((error: unknown) => {
        console.error("ENQUEUE_CONFIRMED_EMAIL_ERROR:", error);
      });
    }

    if (oldStatus !== status && status === "completed") {
      enqueueBookingCompletedEmailJob({
        bookingId,
        customerEmail: currentBooking.email,
        supplierEmail,
        agentEmail,
        adminEmail: process.env.ADMIN_EMAIL || null,
        customerName: currentBooking.customer_name || "Customer",
        restaurantName: currentBooking.service_name || "Restaurant",
        bookingCode: currentBooking.booking_code || bookingId,
        totalBill,
        customerDiscountAmount: amountFields.customer_discount_amount,
        platformCommissionAmount: amountFields.platform_commission_amount,
        agentCommissionAmount: amountFields.agent_commission_amount,
        platformNetAmount: amountFields.platform_net_amount,
      }).catch((error: unknown) => {
        console.error("ENQUEUE_COMPLETED_EMAIL_ERROR:", error);
      });
    }

    if (oldStatus !== status && status === "cancelled") {
      enqueueBookingCancelledEmailJob({
        bookingId,
        customerEmail: currentBooking.email,
        supplierEmail,
        agentEmail,
        adminEmail: process.env.ADMIN_EMAIL || null,
        customerName: currentBooking.customer_name || "Customer",
        restaurantName: currentBooking.service_name || "Restaurant",
        bookingCode: currentBooking.booking_code || bookingId,
        bookingDate: currentBooking.booking_date || "",
        bookingTime: currentBooking.booking_time || "",
        cancellationReason,
      }).catch((error: unknown) => {
        console.error("ENQUEUE_CANCELLED_EMAIL_ERROR:", error);
      });
    }

    revalidatePath("/dashboard/supplier/bookings");
    revalidatePath("/dashboard/supplier");
    revalidatePath("/dashboard/admin/bookings");
    revalidatePath(`/booking/${bookingId}`);

    return {
      success: true,
      message: "Booking updated successfully.",
    };
  } catch (error) {
    console.error("UPDATE_SUPPLIER_BOOKING_STATUS_ERROR:", error);

    return {
      success: false,
      message: "Unable to update booking.",
    };
  }
}
