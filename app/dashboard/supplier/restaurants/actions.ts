"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

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

async function getSupplierId() {
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

  return supplier.id as string;
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

  if (error) {
    throw new Error(error.message);
  }

  return filePath;
}

async function buildPayload(formData: FormData, supplierId: string) {
  const name = getText(formData, "name");
  const manualSlug = getText(formData, "slug");
  const slug = manualSlug || slugify(name);

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

  const uploadedGalleryImages: string[] = [];

  for (const file of galleryFiles) {
    if (file && file.size > 0) {
      const uploadedPath = await uploadRestaurantImage(file, supplierId);
      uploadedGalleryImages.push(uploadedPath);
    }
  }

  const galleryImages = Array.from(
    new Set([
      ...existingGalleryImages,
      ...galleryTextImages,
      ...uploadedGalleryImages,
    ]),
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

  const errors: Record<string, string> = {};

  if (!name) errors.name = "Tên nhà hàng là bắt buộc.";
  if (!slug) errors.slug = "Slug là bắt buộc.";

  return {
    errors,
    payload: {
      supplier_id: supplierId,
      name,
      slug,
      phone: getText(formData, "phone") || null,
      whatsapp: getText(formData, "whatsapp") || null,
      address: getText(formData, "address") || null,
      city: getText(formData, "city") || null,
      latitude: toNullableNumber(formData.get("latitude")),
      longitude: toNullableNumber(formData.get("longitude")),
      short_description: getText(formData, "short_description") || null,
      full_description: getText(formData, "full_description") || null,
      cover_image: coverImage || null,
      gallery_images: galleryImages,
      opening_hours: openingHours,
      price_range: getText(formData, "price_range") || null,
      discount_percent: discountPercent,
      tags: parseCommaList(formData.get("tags")),
      amenities: parseCommaList(formData.get("amenities")),
      is_active: false,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function createRestaurant(
  _prevState: RestaurantManagerState,
  formData: FormData,
): Promise<RestaurantManagerState> {
  try {
    const supplierId = await getSupplierId();
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
      created_at: new Date().toISOString(),
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    revalidatePath("/dashboard/supplier/restaurants");
    revalidatePath("/dashboard/customer");

    return {
      success: true,
      message:
        "Đã tạo restaurant. Trạng thái mặc định là Inactive, chờ Admin duyệt.",
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
    const supplierId = await getSupplierId();
    const restaurantId = getText(formData, "restaurant_id");

    if (!restaurantId) {
      return {
        success: false,
        message: "Missing restaurant id.",
      };
    }

    const { errors, payload } = await buildPayload(formData, supplierId);

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: "Anh kiểm tra lại thông tin nhà hàng.",
        errors,
      };
    }

    const { error } = await adminClient
      .from("restaurants")
      .update(payload)
      .eq("id", restaurantId)
      .eq("supplier_id", supplierId);

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    revalidatePath("/dashboard/supplier/restaurants");
    revalidatePath("/dashboard/customer");

    return {
      success: true,
      message: "Đã cập nhật restaurant.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể cập nhật restaurant.",
    };
  }
}