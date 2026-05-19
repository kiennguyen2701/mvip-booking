'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { deleteCache, deleteCacheByPattern } from '@/lib/cache/cache';
import { cacheKeys, cachePatterns } from '@/lib/cache/keys';
import {
  buildRestaurantChineseContentPatch,
  type RestaurantChineseContent,
} from '@/lib/restaurants/generate-chinese-content';

async function ensureAdmin() {
  const current = await requireAuth();

  if (current.profile?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return current;
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseCommaList(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMultilineList(input: string): string[] {
  return input
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableNumber(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function getNullableText(formData: FormData, key: string) {
  return getText(formData, key) || null;
}

function buildOpeningHours(formData: FormData) {
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  ] as const;

  return days.reduce<Record<string, string>>((acc, day) => {
    acc[day] = String(formData.get(`opening_hours_${day}`) || '').trim();
    return acc;
  }, {});
}

function getManualChineseContent(formData: FormData): Partial<RestaurantChineseContent> {
  return {
    name_zh: getNullableText(formData, 'name_zh'),
    short_description_zh: getNullableText(formData, 'short_description_zh'),
    full_description_zh: getNullableText(formData, 'full_description_zh'),
    address_zh: getNullableText(formData, 'address_zh'),
    city_zh: getNullableText(formData, 'city_zh'),
    cuisine_type_zh: getNullableText(formData, 'cuisine_type_zh'),
    category_zh: getNullableText(formData, 'category_zh'),
  };
}

function getExistingChineseContent(
  restaurant?: Record<string, unknown> | null,
): Partial<RestaurantChineseContent> {
  return {
    name_zh: typeof restaurant?.name_zh === 'string' ? restaurant.name_zh : null,
    short_description_zh:
      typeof restaurant?.short_description_zh === 'string'
        ? restaurant.short_description_zh
        : null,
    full_description_zh:
      typeof restaurant?.full_description_zh === 'string'
        ? restaurant.full_description_zh
        : null,
    address_zh:
      typeof restaurant?.address_zh === 'string' ? restaurant.address_zh : null,
    city_zh: typeof restaurant?.city_zh === 'string' ? restaurant.city_zh : null,
    cuisine_type_zh:
      typeof restaurant?.cuisine_type_zh === 'string'
        ? restaurant.cuisine_type_zh
        : null,
    category_zh:
      typeof restaurant?.category_zh === 'string' ? restaurant.category_zh : null,
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
    String(currentRestaurant.name || '') !== next.name ||
    String(currentRestaurant.short_description || '') !==
      String(next.shortDescription || '') ||
    String(currentRestaurant.full_description || '') !==
      String(next.fullDescription || '') ||
    String(currentRestaurant.city || '') !== String(next.city || '') ||
    String(currentRestaurant.address || '') !== String(next.address || '')
  );
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

function revalidateRestaurantPaths() {
  revalidatePath('/dashboard/admin/restaurants');
  revalidatePath('/dashboard/supplier/restaurants');
  revalidatePath('/dashboard/supplier');
  revalidatePath('/dashboard/customer');
  revalidatePath('/restaurants');
  revalidatePath('/');
}

export async function createRestaurant(formData: FormData): Promise<void> {
  await ensureAdmin();

  const name = String(formData.get('name') || '').trim();
  const slug = slugify(String(formData.get('slug') || '').trim() || name);
  const shortDescription =
    String(formData.get('short_description') || '').trim() || null;
  const fullDescription =
    String(formData.get('full_description') || '').trim() || null;
  const city = String(formData.get('city') || '').trim() || null;
  const address = String(formData.get('address') || '').trim() || null;
  const coverImage = String(formData.get('cover_image') || '').trim() || null;
  const phone = String(formData.get('phone') || '').trim() || null;
  const whatsapp = String(formData.get('whatsapp') || '').trim() || null;
  const priceRange = String(formData.get('price_range') || '').trim() || null;
  const supplierId = String(formData.get('supplier_id') || '').trim();
  const isActive = String(formData.get('is_active') || 'false') === 'true';
  const isFeatured = String(formData.get('is_featured') || 'false') === 'true';
  const latitude = toNullableNumber(String(formData.get('latitude') || ''));
  const longitude = toNullableNumber(String(formData.get('longitude') || ''));
  const tags = parseCommaList(String(formData.get('tags') || ''));
  const amenities = parseCommaList(String(formData.get('amenities') || ''));
  const galleryImages = parseMultilineList(
    String(formData.get('gallery_images') || ''),
  );
  const openingHours = buildOpeningHours(formData);

  if (!name) {
    throw new Error('Restaurant name is required');
  }

  if (!slug) {
    throw new Error('Slug is required');
  }

  if (!supplierId) {
    throw new Error('Supplier is required');
  }

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
    existing: {},
    regenerate: true,
  });

  const { error } = await adminClient.from('restaurants').insert({
    supplier_id: supplierId,
    name,
    slug,
    short_description: shortDescription,
    full_description: fullDescription,
    city,
    address,
    cover_image: coverImage,
    phone,
    whatsapp,
    price_range: priceRange,
    latitude,
    longitude,
    tags,
    amenities,
    gallery_images: galleryImages,
    opening_hours: openingHours,
    is_active: isActive,
    is_featured: isFeatured,
    ...chineseContent,
  });

  if (error) {
    throw new Error(error.message);
  }

  await invalidateRestaurantCaches({
    supplierId,
    newSlug: slug,
  });

  revalidateRestaurantPaths();
}

export async function updateRestaurant(formData: FormData): Promise<void> {
  await ensureAdmin();

  const id = String(formData.get('id') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const slug = slugify(String(formData.get('slug') || '').trim() || name);
  const shortDescription =
    String(formData.get('short_description') || '').trim() || null;
  const fullDescription =
    String(formData.get('full_description') || '').trim() || null;
  const city = String(formData.get('city') || '').trim() || null;
  const address = String(formData.get('address') || '').trim() || null;
  const coverImage = String(formData.get('cover_image') || '').trim() || null;
  const phone = String(formData.get('phone') || '').trim() || null;
  const whatsapp = String(formData.get('whatsapp') || '').trim() || null;
  const priceRange = String(formData.get('price_range') || '').trim() || null;
  const supplierId = String(formData.get('supplier_id') || '').trim();
  const isActive = String(formData.get('is_active') || 'false') === 'true';
  const isFeatured = String(formData.get('is_featured') || 'false') === 'true';
  const latitude = toNullableNumber(String(formData.get('latitude') || ''));
  const longitude = toNullableNumber(String(formData.get('longitude') || ''));
  const tags = parseCommaList(String(formData.get('tags') || ''));
  const amenities = parseCommaList(String(formData.get('amenities') || ''));
  const galleryImages = parseMultilineList(
    String(formData.get('gallery_images') || ''),
  );
  const openingHours = buildOpeningHours(formData);

  if (!id) {
    throw new Error('Restaurant id is required');
  }

  if (!name) {
    throw new Error('Restaurant name is required');
  }

  if (!slug) {
    throw new Error('Slug is required');
  }

  if (!supplierId) {
    throw new Error('Supplier is required');
  }

  const { data: currentRestaurant } = await adminClient
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const regenerateChinese = hasSourceChanged(
    currentRestaurant as Record<string, unknown> | null,
    {
      name,
      shortDescription,
      fullDescription,
      city,
      address,
    },
  );

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
    existing: getExistingChineseContent(
      currentRestaurant as Record<string, unknown> | null,
    ),
    regenerate: regenerateChinese,
  });

  const { error } = await adminClient
    .from('restaurants')
    .update({
      supplier_id: supplierId,
      name,
      slug,
      short_description: shortDescription,
      full_description: fullDescription,
      city,
      address,
      cover_image: coverImage,
      phone,
      whatsapp,
      price_range: priceRange,
      latitude,
      longitude,
      tags,
      amenities,
      gallery_images: galleryImages,
      opening_hours: openingHours,
      is_active: isActive,
      is_featured: isFeatured,
      ...chineseContent,
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  await invalidateRestaurantCaches({
    supplierId: supplierId || currentRestaurant?.supplier_id,
    oldSlug: currentRestaurant?.slug,
    newSlug: slug,
  });

  if (
    currentRestaurant?.supplier_id &&
    currentRestaurant.supplier_id !== supplierId
  ) {
    await deleteCache(cacheKeys.supplierDashboard(currentRestaurant.supplier_id));
  }

  revalidateRestaurantPaths();
}

export async function deleteRestaurant(formData: FormData): Promise<void> {
  await ensureAdmin();

  const id = String(formData.get('id') || '').trim();

  if (!id) {
    throw new Error('Restaurant id is required');
  }

  const { data: currentRestaurant } = await adminClient
    .from('restaurants')
    .select('id, slug, supplier_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await adminClient.from('restaurants').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  await invalidateRestaurantCaches({
    supplierId: currentRestaurant?.supplier_id,
    oldSlug: currentRestaurant?.slug,
  });

  revalidateRestaurantPaths();
}
