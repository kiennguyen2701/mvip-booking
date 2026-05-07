"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

async function ensureAdmin() {
  const current = await requireAuth();

  if (current.profile?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return current;
}

export async function approveRestaurant(id: string) {
  await ensureAdmin();

  const { error } = await adminClient
    .from("restaurants")
    .update({
      status: "approved",
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin/supplier-requests");
  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/customer");
  revalidatePath("/restaurants");
}

export async function rejectRestaurant(id: string) {
  await ensureAdmin();

  const { error } = await adminClient
    .from("restaurants")
    .update({
      status: "rejected",
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin/supplier-requests");
  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/customer");
  revalidatePath("/restaurants");
}

export async function approveRestaurantChangeRequest(id: string) {
  const current = await ensureAdmin();

  const { data: request, error: requestError } = await adminClient
    .from("restaurant_change_requests")
    .select("*")
    .eq("id", id)
    .eq("status", "pending_review")
    .maybeSingle();

  if (requestError || !request) {
    throw new Error(requestError?.message || "Change request not found.");
  }

  const newData = request.new_data as Record<string, unknown>;

  const { error: updateError } = await adminClient
    .from("restaurants")
    .update({
      ...newData,
      status: "approved",
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.restaurant_id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: requestUpdateError } = await adminClient
    .from("restaurant_change_requests")
    .update({
      status: "approved",
      reviewed_by: current.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (requestUpdateError) {
    throw new Error(requestUpdateError.message);
  }

  revalidatePath("/dashboard/admin/supplier-requests");
  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/customer");
  revalidatePath("/restaurants");
}

export async function rejectRestaurantChangeRequest(id: string) {
  const current = await ensureAdmin();

  const { data: request, error: requestError } = await adminClient
    .from("restaurant_change_requests")
    .select("id, restaurant_id")
    .eq("id", id)
    .eq("status", "pending_review")
    .maybeSingle();

  if (requestError || !request) {
    throw new Error(requestError?.message || "Change request not found.");
  }

  const { error: requestUpdateError } = await adminClient
    .from("restaurant_change_requests")
    .update({
      status: "rejected",
      reviewed_by: current.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (requestUpdateError) {
    throw new Error(requestUpdateError.message);
  }

  await adminClient
    .from("restaurants")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.restaurant_id)
    .eq("is_active", true);

  revalidatePath("/dashboard/admin/supplier-requests");
  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/customer");
  revalidatePath("/restaurants");
}