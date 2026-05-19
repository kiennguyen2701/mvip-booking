import translate from "google-translate-api-x";

type Input = {
  name?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  address?: string | null;
  city?: string | null;
  cuisine_type?: string | null;
  category?: string | null;
};

export async function generateChineseRestaurantContent(
  input: Input
) {
  async function toChinese(text?: string | null) {
    if (!text || !text.trim()) {
      return null;
    }

    try {
      const result = await translate(text, {
        to: "zh-CN",
      });

      return result.text || null;
    } catch (error) {
      console.error(
        "GOOGLE_TRANSLATE_ERROR:",
        error
      );

      return null;
    }
  }

  return {
    name_zh: await toChinese(input.name),

    short_description_zh: await toChinese(
      input.short_description
    ),

    full_description_zh: await toChinese(
      input.full_description
    ),

    address_zh: await toChinese(input.address),

    city_zh: await toChinese(input.city),

    cuisine_type_zh: await toChinese(
      input.cuisine_type
    ),

    category_zh: await toChinese(
      input.category
    ),
  };
}