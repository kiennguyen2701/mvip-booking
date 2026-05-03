"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SupplierProfileFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

const PRICE_RANGE_OPTIONS = ["$", "$$", "$$$", "$$$$"] as const;

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseCommaList(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMultilineList(input: string): string[] {
  return input
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildOpeningHours(formData: FormData): Record<string, string> {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const;

  return days.reduce<Record<string, string>>((acc, day) => {
    acc[day] = String(formData.get(`opening_hours_${day}`) ?? "").trim();
    return acc;
  }, {});
}

export async function updateSupplierProfile(
  _prevState: SupplierProfileFormState,
  formData: FormData
): Promise<SupplierProfileFormState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Bạn chưa đăng nhập hoặc session đã hết hạn.",
    };
  }

  const companyName = String(formData.get("company_name") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  const manualSlug = String(formData.get("slug") ?? "").trim();
  const shortDescription = String(formData.get("short_description") ?? "").trim();
  const fullDescription = String(formData.get("full_description") ?? "").trim();
  const coverImage = String(formData.get("cover_image") ?? "").trim();
  const galleryImagesRaw = String(formData.get("gallery_images") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const priceRange = String(formData.get("price_range") ?? "").trim();
  const amenitiesRaw = String(formData.get("amenities") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();

  const latitude = toNullableNumber(formData.get("latitude"));
  const longitude = toNullableNumber(formData.get("longitude"));

  const errors: Record<string, string> = {};

  if (!companyName) errors.company_name = "Vui lòng nhập tên nhà hàng.";
  if (!contactName) errors.contact_name = "Vui lòng nhập người liên hệ.";
  if (!phone) errors.phone = "Vui lòng nhập số điện thoại.";
  if (!email) errors.email = "Vui lòng nhập email.";

  if (
    priceRange &&
    !PRICE_RANGE_OPTIONS.includes(
      priceRange as (typeof PRICE_RANGE_OPTIONS)[number]
    )
  ) {
    errors.price_range = "Mức giá không hợp lệ.";
  }

  const slug = slugify(manualSlug || companyName);

  if (!slug) {
    errors.slug = "Slug không hợp lệ.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Dữ liệu chưa hợp lệ.",
      errors,
    };
  }

  // 1) Read current supplier row by logged-in user
  const { data: supplierRow, error: supplierError } = await supabase
    .from("suppliers")
    .select("id, user_id, slug, company_name")
    .eq("user_id", user.id)
    .single();

  if (supplierError || !supplierRow) {
    return {
      success: false,
      message:
        `Không tìm thấy supplier row cho user hiện tại. auth.uid=${user.id}`,
    };
  }

  // 2) Check duplicate slug
  const { data: duplicatedSlug, error: duplicatedSlugError } = await supabase
    .from("suppliers")
    .select("id")
    .eq("slug", slug)
    .neq("id", supplierRow.id)
    .maybeSingle();

  if (duplicatedSlugError) {
    return {
      success: false,
      message: duplicatedSlugError.message || "Không kiểm tra được slug.",
    };
  }

  if (duplicatedSlug) {
    return {
      success: false,
      message: "Slug đã tồn tại.",
      errors: {
        slug: "Slug đã tồn tại.",
      },
    };
  }

  const payload = {
    company_name: companyName,
    contact_name: contactName,
    phone,
    email,
    address: address || null,
    city: city || null,
    slug,
    short_description: shortDescription || null,
    full_description: fullDescription || null,
    cover_image: coverImage || null,
    gallery_images: parseMultilineList(galleryImagesRaw),
    whatsapp: whatsapp || null,
    opening_hours: buildOpeningHours(formData),
    price_range: priceRange || null,
    amenities: parseCommaList(amenitiesRaw),
    tags: parseCommaList(tagsRaw),
    latitude,
    longitude,
    updated_at: new Date().toISOString(),
  };

  // 3) Update by supplier primary key
  const { error: updateError } = await supabase
    .from("suppliers")
    .update(payload)
    .eq("id", supplierRow.id);

  if (updateError) {
    return {
      success: false,
      message: `Update thất bại: ${updateError.message}`,
    };
  }

  // 4) Re-read row to confirm update really happened
  const { data: refreshedSupplier, error: refreshedError } = await supabase
    .from("suppliers")
    .select(`
      id,
      user_id,
      company_name,
      contact_name,
      phone,
      email,
      address,
      city,
      slug,
      short_description,
      full_description,
      cover_image,
      gallery_images,
      whatsapp,
      opening_hours,
      price_range,
      amenities,
      tags,
      latitude,
      longitude,
      updated_at
    `)
    .eq("id", supplierRow.id)
    .single();

  if (refreshedError || !refreshedSupplier) {
    return {
      success: false,
      message:
        `Update xong nhưng không đọc lại được row. auth.uid=${user.id}, supplier_id=${supplierRow.id}`,
    };
  }

  // 5) Optional confirm field changed
  if (String(refreshedSupplier.company_name ?? "") !== companyName) {
    return {
      success: false,
      message:
        `DB chưa phản ánh dữ liệu mới. auth.uid=${user.id}, supplier_id=${supplierRow.id}, company_name_db=${String(
          refreshedSupplier.company_name ?? ""
        )}`,
    };
  }

  revalidatePath("/dashboard/supplier");
  revalidatePath("/dashboard/supplier/profile");
  revalidatePath("/restaurants");
  revalidatePath("/");

  return {
    success: true,
    message: "Đã cập nhật hồ sơ nhà hàng thành công.",
  };
}