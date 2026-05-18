"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { deleteCache, deleteCacheByPattern } from "@/lib/cache/cache";
import { cacheKeys, cachePatterns } from "@/lib/cache/keys";
import {
  buildRestaurantChineseContentPatch,
  type RestaurantChineseContent,
} from "@/lib/restaurants/generate-chinese-content";

export type RestaurantManagerState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parseCommaList(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLines(value: FormDataEntryValue | null) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableNumber(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function getNullableText(formData: FormData, key: string) {
  return getText(formData, key) || null;
}

function getManualChineseContent(formData: FormData): Partial<RestaurantChineseContent> {
  return {
    name_zh: getNullableText(formData, "name_zh"),
    short_description_zh: getNullableText(formData, "short_description_zh"),
    full_description_zh: getNullableText(formData, "full_description_zh"),
    address_zh: getNullableText(formData, "address_zh"),
    city_zh: getNullableText(formData, "city_zh"),
    cuisine_type_zh: getNullableText(formData, "cuisine_type_zh"),
    category_zh: getNullableText(formData, "category_zh"),
  };
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

function hasSourceChanged(
  currentRestaurant: Record<string, unknown> | null | undefined,
  next: {
    name: string;
    shortDescription: string | null;
    fullDescription: string | null;
    city: string | null;
    address: string | null;
  },
) {
  if (!currentRestaurant) return true;

  return (
    String(currentRestaurant.name || "") !== next.name ||
    String(currentRestaurant.short_description || "") !== String(next.shortDescription || "") ||
    String(currentRestaurant.full_description || "") !== String(next.fullDescription || "") ||
    String(currentRestaurant.city || "") !== String(next.city || "") ||
    String(currentRestaurant.address || "") !== String(next.address || "")
  );
}

async function getSupplierContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: supplier } = await adminClient
    .from("suppliers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!supplier) throw new Error("Supplier profile not found");

  return {
    userId: user.id,
    supplierId: supplier.id as string,
  };
}

async function invalidateRestaurantCaches(options: {
  supplierId: string;
  slug?: string | null;
}) {
  await deleteCache(cacheKeys.supplierDashboard(options.supplierId));
  await deleteCacheByPattern(cachePatterns.publicRestaurants());

  if (options.slug) {
    await deleteCache(cacheKeys.publicRestaurantDetail(options.slug));
  }
}

async function uploadRestaurantImage(file: File, supplierId: string) {
  if (!file || file.size === 0) return "";

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const filePath = `${supplierId}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error } = await adminClient.storage
    .from("restaurants")
    .upload(filePath, arrayBuffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error(error.message);

  return filePath;
}

async function uploadMany(files: File[], supplierId: string) {
  const uploaded: string[] = [];

  for (const file of files) {
    if (file && file.size > 0) {
      uploaded.push(await uploadRestaurantImage(file, supplierId));
    }
  }

  return uploaded;
}

async function buildPayload(
  formData: FormData,
  supplierId: string,
  currentRestaurant?: Record<string, unknown> | null,
) {
  const name = getText(formData, "name");
  const manualSlug = getText(formData, "slug");
  const slug = manualSlug ? slugify(manualSlug) : slugify(name);

  const coverImageUrl = getText(formData, "cover_image");
  const existingCoverImage = getText(formData, "existing_cover_image");
  const coverFile = formData.get("cover_image_file") as File | null;

  let coverImage = coverImageUrl || existingCoverImage || "";

  if (coverFile && coverFile.size > 0) {
    coverImage = await uploadRestaurantImage(coverFile, supplierId);
  }

  const galleryTextImages = parseLines(formData.get("gallery_images"));
  const existingGalleryImages = parseLines(
    formData.get("existing_gallery_images"),
  );
  const galleryFiles = formData.getAll("gallery_image_files") as File[];
  const uploadedGalleryImages = await uploadMany(galleryFiles, supplierId);

  const galleryImages = Array.from(
    new Set([
      ...existingGalleryImages,
      ...galleryTextImages,
      ...uploadedGalleryImages,
    ]),
  );

  const menuTextImages = parseLines(formData.get("menu_images"));
  const existingMenuImages = parseLines(formData.get("existing_menu_images"));
  const menuFiles = formData.getAll("menu_image_files") as File[];
  const uploadedMenuImages = await uploadMany(menuFiles, supplierId);

  const menuImages = Array.from(
    new Set([...existingMenuImages, ...menuTextImages, ...uploadedMenuImages]),
  );

  const discountPercent = toNullableNumber(formData.get("discount_percent")) ?? 5;

  const openingHours = {
    monday: getText(formData, "opening_hours_monday"),
    tuesday: getText(formData, "opening_hours_tuesday"),
    wednesday: getText(formData, "opening_hours_wednesday"),
    thursday: getText(formData, "opening_hours_thursday"),
    friday: getText(formData, "opening_hours_friday"),
    saturday: getText(formData, "opening_hours_saturday"),
    sunday: getText(formData, "opening_hours_sunday"),
  };

  const shortDescription = getText(formData, "short_description") || null;
  const fullDescription = getText(formData, "full_description") || null;
  const address = getText(formData, "address") || null;
  const city = getText(formData, "city") || null;
  const tags = parseCommaList(formData.get("tags"));
  const amenities = parseCommaList(formData.get("amenities"));
  const priceRange = getText(formData, "price_range") || null;

  const errors: Record<string, string> = {};

  if (!name) errors.name = "Tên nhà hàng là bắt buộc.";
  if (!slug) errors.slug = "Slug là bắt buộc.";

  const regenerateChinese = hasSourceChanged(currentRestaurant, {
    name,
    shortDescription,
    fullDescription,
    city,
    address,
  });

  const chineseContent = await buildRestaurantChineseContentPatch({
    source: {
      name,
      shortDescription,
      fullDescription,
      address,
      city,
      cuisineType: tags[0] || null,
      category: tags[0] || null,
    },
    manual: getManualChineseContent(formData),
    existing: getExistingChineseContent(currentRestaurant),
    regenerate: regenerateChinese,
  });

  return {
    errors,
    payload: {
      supplier_id: supplierId,
      name,
      slug,
      phone: getText(formData, "phone") || null,
      whatsapp: getText(formData, "whatsapp") || null,
      address,
      city,
      latitude: toNullableNumber(formData.get("latitude")),
      longitude: toNullableNumber(formData.get("longitude")),
      short_description: shortDescription,
      full_description: fullDescription,
      cover_image: coverImage || null,
      gallery_images: galleryImages,
      menu_images: menuImages,
      opening_hours: openingHours,
      price_range: priceRange,
      discount_percent: discountPercent,
      tags,
      amenities,
      updated_at: new Date().toISOString(),
      ...chineseContent,
    },
  };
}

export async function createRestaurant(
  _prevState: RestaurantManagerState,
  formData: FormData,
): Promise<RestaurantManagerState> {
  try {
    const { supplierId } = await getSupplierContext();
    const { errors, payload } = await buildPayload(formData, supplierId);

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: "Anh kiểm tra lại thông tin nhà hàng.",
        errors,
      };
    }

    const { error } = await adminClient.from("restaurants").insert({
      ...payload,
      status: "pending_review",
      is_active: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    await invalidateRestaurantCaches({
      supplierId,
      slug: String(payload.slug || ""),
    });

    revalidatePath("/dashboard/supplier/restaurants");
    revalidatePath("/dashboard/supplier");
    revalidatePath("/dashboard/admin/supplier-requests");
    revalidatePath("/dashboard/customer");
    revalidatePath("/restaurants");

    return {
      success: true,
      message:
        "Đã gửi restaurant mới lên Admin duyệt. Nhà hàng sẽ hiển thị sau khi được approve.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể tạo restaurant.",
    };
  }
}

export async function updateRestaurant(
  _prevState: RestaurantManagerState,
  formData: FormData,
): Promise<RestaurantManagerState> {
  try {
    const { supplierId, userId } = await getSupplierContext();
    const restaurantId = getText(formData, "restaurant_id");

    if (!restaurantId) {
      return {
        success: false,
        message: "Missing restaurant id.",
      };
    }

    const { data: currentRestaurant, error: currentError } = await adminClient
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .eq("supplier_id", supplierId)
      .maybeSingle();

    if (currentError || !currentRestaurant) {
      return {
        success: false,
        message: "Không tìm thấy restaurant thuộc supplier này.",
      };
    }

    const { errors, payload } = await buildPayload(
      formData,
      supplierId,
      currentRestaurant as Record<string, unknown>,
    );

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: "Anh kiểm tra lại thông tin nhà hàng.",
        errors,
      };
    }

    const { error: requestError } = await adminClient
      .from("restaurant_change_requests")
      .insert({
        restaurant_id: restaurantId,
        supplier_id: supplierId,
        status: "pending_review",
        old_data: currentRestaurant,
        new_data: payload,
        requested_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (requestError) {
      return {
        success: false,
        message: requestError.message,
      };
    }

    await adminClient
      .from("restaurants")
      .update({
        status: "pending_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurantId)
      .eq("supplier_id", supplierId);

    await invalidateRestaurantCaches({
      supplierId,
      slug: currentRestaurant.slug || String(payload.slug || ""),
    });

    if (currentRestaurant.slug && currentRestaurant.slug !== payload.slug) {
      await deleteCache(cacheKeys.publicRestaurantDetail(currentRestaurant.slug));
    }

    revalidatePath("/dashboard/supplier/restaurants");
    revalidatePath("/dashboard/supplier");
    revalidatePath("/dashboard/admin/supplier-requests");
    revalidatePath("/restaurants");

    return {
      success: true,
      message:
        "Đã gửi yêu cầu thay đổi lên Admin duyệt. Dữ liệu public cũ vẫn được giữ nguyên cho đến khi Admin approve.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể cập nhật restaurant.",
    };
  }
}
