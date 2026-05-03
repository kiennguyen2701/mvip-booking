const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export function getRestaurantImageUrl(value?: string | null) {
  if (!value) return "";

  const clean = value.trim();
  if (!clean) return "";

  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("/")
  ) {
    return clean;
  }

  if (!SUPABASE_URL) return "";

  return `${SUPABASE_URL}/storage/v1/object/public/restaurants/${clean}`;
}

export function getRestaurantImages({
  coverImage,
  galleryImages,
}: {
  coverImage?: string | null;
  galleryImages?: string[] | null;
}) {
  const images = [
    getRestaurantImageUrl(coverImage),
    ...(galleryImages || []).map((item) => getRestaurantImageUrl(item)),
  ].filter(Boolean);

  return Array.from(new Set(images));
}