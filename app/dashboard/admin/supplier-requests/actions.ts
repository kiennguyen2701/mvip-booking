"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { deleteCache, deleteCacheByPattern } from "@/lib/cache/cache";
import { cacheKeys, cachePatterns } from "@/lib/cache/keys";
import {
  buildRestaurantChineseContentPatch,
  type RestaurantChineseContent,
} from "@/lib/restaurants/generate-chinese-content";

async function ensureAdmin() {
  const current = await requireAuth();

  if (current.profile?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return current;
}

function cleanNullable(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

function getExistingChineseContent(
  restaurant?: Record<string, unknown> | null,
): Partial<RestaurantChineseContent> {
  return {
    name_zh: typeof restaurant?.name_zh === "string" ? restaurant.name_zh : null,
    short_description_zh:
      typeof restaurant?.short_description_zh === "string"
        ? restaurant.short_description_zh
        : null,
    full_description_zh:
      typeof restaurant?.full_description_zh === "string"
        ? restaurant.full_description_zh
        : null,
    address_zh:
      typeof restaurant?.address_zh === "string" ? restaurant.address_zh : null,
    city_zh: typeof restaurant?.city_zh === "string" ? restaurant.city_zh : null,
    cuisine_type_zh:
      typeof restaurant?.cuisine_type_zh === "string"
        ? restaurant.cuisine_type_zh
        : null,
    category_zh:
      typeof restaurant?.category_zh === "string" ? restaurant.category_zh : null,
  };
}

function getSourceFromRestaurant(restaurant: Record<string, unknown>) {
  const tags = Array.isArray(restaurant.tags) ? restaurant.tags : [];
  const firstTag = typeof tags[0] === "string" ? tags[0] : null;

  return {
    name: cleanNullable(restaurant.name),
    shortDescription: cleanNullable(restaurant.short_description),
    fullDescription: cleanNullable(restaurant.full_description),
    address: cleanNullable(restaurant.address),
    city: cleanNullable(restaurant.city),
    cuisineType: cleanNullable(restaurant.cuisine_type) || firstTag,
    category: cleanNullable(restaurant.category) || firstTag,
  };
}

async function invalidateRestaurantCaches(options: {
  supplierId?: string | null;
  slug?: string | null;
}) {
  await deleteCacheByPattern(cachePatterns.publicRestaurants());

  if (options.slug) {
    await deleteCache(cacheKeys.publicRestaurantDetail(options.slug));
  }

  if (options.supplierId) {
    await deleteCache(cacheKeys.supplierDashboard(options.supplierId));
  }
}

async function buildChinesePatchForRestaurant(
  restaurant: Record<string, unknown>,
  regenerate: boolean,
) {
  return buildRestaurantChineseContentPatch({
    source: getSourceFromRestaurant(restaurant),
    existing: getExistingChineseContent(restaurant),
    manual: getExistingChineseContent(restaurant),
    regenerate,
  });
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

  const { data: restaurant, error: restaurantError } = await adminClient
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    throw new Error(restaurantError?.message || "Restaurant not found.");
  }

  const restaurantRecord = restaurant as Record<string, unknown>;

  const chineseContent = await buildChinesePatchForRestaurant(
    restaurantRecord,
    false,
  );

  const { error } = await adminClient
    .from("restaurants")
    .update({
      ...chineseContent,
      status: "approved",
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await invalidateRestaurantCaches({
    supplierId: cleanNullable(restaurantRecord.supplier_id),
    slug: cleanNullable(restaurantRecord.slug),
  });

  revalidateSupplierRequestPaths();
}

export async function rejectRestaurant(id: string) {
  await ensureAdmin();

  const { data: restaurant } = await adminClient
    .from("restaurants")
    .select("supplier_id, slug")
    .eq("id", id)
    .maybeSingle();

  const restaurantRecord = restaurant as Record<string, unknown> | null;

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
    supplierId: cleanNullable(restaurantRecord?.supplier_id),
    slug: cleanNullable(restaurantRecord?.slug),
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

  const requestRecord = request as Record<string, unknown>;

  const { data: currentRestaurant } = await adminClient
    .from("restaurants")
    .select("*")
    .eq("id", requestRecord.restaurant_id)
    .maybeSingle();

  const currentRestaurantRecord =
    currentRestaurant as Record<string, unknown> | null;

  const newData =
    typeof requestRecord.new_data === "object" && requestRecord.new_data !== null
      ? (requestRecord.new_data as Record<string, unknown>)
      : {};

  const chineseContent = await buildRestaurantChineseContentPatch({
    source: getSourceFromRestaurant(newData),
    manual: getExistingChineseContent(newData),
    existing: getExistingChineseContent(currentRestaurantRecord),
    regenerate: true,
  });

  const mergedNewData: Record<string, unknown> = {
    ...newData,
    ...chineseContent,
  };

  const { error: updateError } = await adminClient
    .from("restaurants")
    .update({
      ...mergedNewData,
      status: "approved",
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestRecord.restaurant_id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: requestUpdateError } = await adminClient
    .from("restaurant_change_requests")
    .update({
      status: "approved",
      new_data: mergedNewData,
      reviewed_by: current.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (requestUpdateError) {
    throw new Error(requestUpdateError.message);
  }

  await invalidateRestaurantCaches({
    supplierId:
      cleanNullable(mergedNewData.supplier_id) ||
      cleanNullable(currentRestaurantRecord?.supplier_id) ||
      cleanNullable(requestRecord.supplier_id),
    slug:
      cleanNullable(mergedNewData.slug) ||
      cleanNullable(currentRestaurantRecord?.slug),
  });

  revalidateSupplierRequestPaths();
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

  const requestRecord = request as Record<string, unknown>;

  const { data: restaurant } = await adminClient
    .from("restaurants")
    .select("supplier_id, slug")
    .eq("id", requestRecord.restaurant_id)
    .maybeSingle();

  const restaurantRecord = restaurant as Record<string, unknown> | null;

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
    .eq("id", requestRecord.restaurant_id)
    .eq("is_active", true);

  await invalidateRestaurantCaches({
    supplierId: cleanNullable(restaurantRecord?.supplier_id),
    slug: cleanNullable(restaurantRecord?.slug),
  });

  revalidateSupplierRequestPaths();
}