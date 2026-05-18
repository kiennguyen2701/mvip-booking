"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { deleteCache, deleteCacheByPattern } from "@/lib/cache/cache";
import { cacheKeys, cachePatterns } from "@/lib/cache/keys";

async function ensureAdmin() {
  const current = await requireAuth();

  if (current.profile?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return current;
}

async function invalidateRestaurantCaches(options: {
  supplierId?: string | null;
  oldSlug?: string | null;
  newSlug?: string | null;
}) {
  await deleteCacheByPattern(cachePatterns.publicRestaurants());

  if (options.oldSlug) {
    await deleteCache(cacheKeys.publicRestaurantDetail(options.oldSlug));
  }

  if (options.newSlug && options.newSlug !== options.oldSlug) {
    await deleteCache(cacheKeys.publicRestaurantDetail(options.newSlug));
  }

  if (options.supplierId) {
    await deleteCache(cacheKeys.supplierDashboard(options.supplierId));
  }
}

function revalidateSupplierRequestPaths() {
  revalidatePath("/dashboard/admin/supplier-requests");
  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/customer");
  revalidatePath("/restaurants");
  revalidatePath("/");
}

export async function approveRestaurant(id: string) {
  await ensureAdmin();

  const { data: currentRestaurant } = await adminClient
    .from("restaurants")
    .select("id, slug, supplier_id")
    .eq("id", id)
    .maybeSingle();

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

  await invalidateRestaurantCaches({
    supplierId: currentRestaurant?.supplier_id,
    newSlug: currentRestaurant?.slug,
  });

  revalidateSupplierRequestPaths();
}

export async function rejectRestaurant(id: string) {
  await ensureAdmin();

  const { data: currentRestaurant } = await adminClient
    .from("restaurants")
    .select("id, slug, supplier_id")
    .eq("id", id)
    .maybeSingle();

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

  await invalidateRestaurantCaches({
    supplierId: currentRestaurant?.supplier_id,
    oldSlug: currentRestaurant?.slug,
  });

  revalidateSupplierRequestPaths();
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
  const oldData = request.old_data as Record<string, unknown> | null;
  const oldSlug =
    typeof oldData?.slug === "string" ? oldData.slug : undefined;
  const newSlug = typeof newData.slug === "string" ? newData.slug : oldSlug;
  const supplierId =
    typeof request.supplier_id === "string"
      ? request.supplier_id
      : typeof newData.supplier_id === "string"
        ? newData.supplier_id
        : null;

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

  await invalidateRestaurantCaches({
    supplierId,
    oldSlug,
    newSlug,
  });

  revalidateSupplierRequestPaths();
}

export async function rejectRestaurantChangeRequest(id: string) {
  const current = await ensureAdmin();

  const { data: request, error: requestError } = await adminClient
    .from("restaurant_change_requests")
    .select("id, restaurant_id, supplier_id, old_data, new_data")
    .eq("id", id)
    .eq("status", "pending_review")
    .maybeSingle();

  if (requestError || !request) {
    throw new Error(requestError?.message || "Change request not found.");
  }

  const oldData = request.old_data as Record<string, unknown> | null;
  const newData = request.new_data as Record<string, unknown> | null;
  const oldSlug =
    typeof oldData?.slug === "string" ? oldData.slug : undefined;
  const newSlug =
    typeof newData?.slug === "string" ? newData.slug : oldSlug;

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

  await invalidateRestaurantCaches({
    supplierId: request.supplier_id,
    oldSlug,
    newSlug,
  });

  revalidateSupplierRequestPaths();
}
