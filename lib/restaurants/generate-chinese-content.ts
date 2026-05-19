import translate from "google-translate-api-x";

export type RestaurantChineseContent = {
  name_zh: string | null;
  short_description_zh: string | null;
  full_description_zh: string | null;
  address_zh: string | null;
  city_zh: string | null;
  cuisine_type_zh: string | null;
  category_zh: string | null;
};

type RestaurantChineseSource = {
  name?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  address?: string | null;
  city?: string | null;
  cuisineType?: string | null;
  category?: string | null;
};

type BuildChineseContentPatchParams = {
  source: RestaurantChineseSource;
  manual?: Partial<RestaurantChineseContent>;
  existing?: Partial<RestaurantChineseContent>;
  regenerate?: boolean;
};

function cleanText(value?: string | null) {
  const text = String(value || "").trim();
  return text || null;
}

async function translateToChinese(text?: string | null) {
  const value = cleanText(text);

  if (!value) return null;

  try {
    const result = await translate(value, {
      to: "zh-CN",
    });

    return cleanText(result.text);
  } catch (error) {
    console.error("GENERATE_RESTAURANT_CHINESE_CONTENT_ERROR:", error);
    return null;
  }
}

function pickManual(value?: string | null) {
  return cleanText(value);
}

function shouldKeepExisting(
  regenerate: boolean,
  manualValue?: string | null,
  existingValue?: string | null,
) {
  if (pickManual(manualValue)) return false;
  if (regenerate) return false;
  return Boolean(cleanText(existingValue));
}

export async function buildRestaurantChineseContentPatch({
  source,
  manual = {},
  existing = {},
  regenerate = false,
}: BuildChineseContentPatchParams): Promise<Partial<RestaurantChineseContent>> {
  const patch: Partial<RestaurantChineseContent> = {};

  async function buildField(
    key: keyof RestaurantChineseContent,
    sourceValue?: string | null,
  ) {
    const manualValue = pickManual(manual[key]);
    const existingValue = cleanText(existing[key]);

    if (manualValue) {
      patch[key] = manualValue;
      return;
    }

    if (shouldKeepExisting(regenerate, manualValue, existingValue)) {
      patch[key] = existingValue;
      return;
    }

    const translated = await translateToChinese(sourceValue);

    if (translated) {
      patch[key] = translated;
    } else if (existingValue) {
      patch[key] = existingValue;
    }
  }

  await buildField("name_zh", source.name);
  await buildField("short_description_zh", source.shortDescription);
  await buildField("full_description_zh", source.fullDescription);
  await buildField("address_zh", source.address);
  await buildField("city_zh", source.city);
  await buildField("cuisine_type_zh", source.cuisineType);
  await buildField("category_zh", source.category);

  return patch;
}

export async function generateChineseRestaurantContent(input: {
  name?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  address?: string | null;
  city?: string | null;
  cuisine_type?: string | null;
  category?: string | null;
}): Promise<RestaurantChineseContent> {
  return {
    name_zh: await translateToChinese(input.name),
    short_description_zh: await translateToChinese(input.short_description),
    full_description_zh: await translateToChinese(input.full_description),
    address_zh: await translateToChinese(input.address),
    city_zh: await translateToChinese(input.city),
    cuisine_type_zh: await translateToChinese(input.cuisine_type),
    category_zh: await translateToChinese(input.category),
  };
}