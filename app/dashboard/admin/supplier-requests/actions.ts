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
  revalidatePath("/restaurants");
}