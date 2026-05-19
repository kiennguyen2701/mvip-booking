export type RestaurantChineseContentInput = {
  name?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  address?: string | null;
  city?: string | null;
  cuisineType?: string | null;
  category?: string | null;
};

export type RestaurantChineseContent = {
  name_zh: string | null;
  short_description_zh: string | null;
  full_description_zh: string | null;
  address_zh: string | null;
  city_zh: string | null;
  cuisine_type_zh: string | null;
  category_zh: string | null;
};

export type RestaurantChineseContentPatch = Partial<RestaurantChineseContent>;

const EMPTY_CHINESE_CONTENT: RestaurantChineseContent = {
  name_zh: null,
  short_description_zh: null,
  full_description_zh: null,
  address_zh: null,
  city_zh: null,
  cuisine_type_zh: null,
  category_zh: null,
};

const RESTAURANT_CHINESE_KEYS: Array<keyof RestaurantChineseContent> = [
  "name_zh",
  "short_description_zh",
  "full_description_zh",
  "address_zh",
  "city_zh",
  "cuisine_type_zh",
  "category_zh",
];

function cleanText(value?: string | null) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

function getApiKey() {
  return (
    process.env.AI_TRANSLATION_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_KEY ||
    ""
  ).trim();
}

function getApiUrl() {
  return (
    process.env.AI_TRANSLATION_API_URL ||
    "https://api.openai.com/v1/chat/completions"
  ).trim();
}

function getModel() {
  return (process.env.AI_TRANSLATION_MODEL || "gpt-4o-mini").trim();
}

function extractJsonObject(raw: string) {
  const text = raw.trim();

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function normalizeChineseContent(value: Record<string, unknown> | null) {
  if (!value) return EMPTY_CHINESE_CONTENT;

  return {
    name_zh: cleanText(String(value.name_zh || "")),
    short_description_zh: cleanText(String(value.short_description_zh || "")),
    full_description_zh: cleanText(String(value.full_description_zh || "")),
    address_zh: cleanText(String(value.address_zh || "")),
    city_zh: cleanText(String(value.city_zh || "")),
    cuisine_type_zh: cleanText(String(value.cuisine_type_zh || "")),
    category_zh: cleanText(String(value.category_zh || "")),
  } satisfies RestaurantChineseContent;
}

function buildPrompt(input: RestaurantChineseContentInput) {
  return `You are helping a premium restaurant booking platform translate and localize restaurant content into Simplified Chinese for Chinese-speaking customers.

Rules:
- Return JSON only. No markdown. No explanation.
- Keep proper restaurant brand names recognizable.
- Use natural Simplified Chinese, premium hospitality tone.
- Do not invent facts that are not present.
- If a field is empty, return null for that Chinese field.
- short_description_zh should be concise and attractive, around 30-80 Chinese characters if possible.
- full_description_zh can be more detailed but must remain faithful to the original.

Input:
name: ${input.name || ""}
shortDescription: ${input.shortDescription || ""}
fullDescription: ${input.fullDescription || ""}
address: ${input.address || ""}
city: ${input.city || ""}
cuisineType: ${input.cuisineType || ""}
category: ${input.category || ""}

Return exactly this JSON shape:
{
  "name_zh": string | null,
  "short_description_zh": string | null,
  "full_description_zh": string | null,
  "address_zh": string | null,
  "city_zh": string | null,
  "cuisine_type_zh": string | null,
  "category_zh": string | null
}`;
}

export async function generateRestaurantChineseContent(
  input: RestaurantChineseContentInput,
): Promise<RestaurantChineseContent> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error("GENERATE_RESTAURANT_CHINESE_CONTENT_MISSING_API_KEY");
    return EMPTY_CHINESE_CONTENT;
  }

  const sourceHasContent = [
    input.name,
    input.shortDescription,
    input.fullDescription,
    input.address,
    input.city,
    input.cuisineType,
    input.category,
  ].some((value) => Boolean(cleanText(value)));

  if (!sourceHasContent) {
    return EMPTY_CHINESE_CONTENT;
  }

  try {
    const response = await fetch(getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You translate and localize restaurant booking content into Simplified Chinese. Return valid JSON only.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("GENERATE_RESTAURANT_CHINESE_CONTENT_HTTP_ERROR:", {
        status: response.status,
        body: errorText,
      });
      return EMPTY_CHINESE_CONTENT;
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
    };

    const rawContent = data.choices?.[0]?.message?.content || "";
    const normalized = normalizeChineseContent(extractJsonObject(rawContent));

    const generatedSomething = RESTAURANT_CHINESE_KEYS.some((key) =>
      Boolean(cleanText(normalized[key])),
    );

    if (!generatedSomething) {
      console.error("GENERATE_RESTAURANT_CHINESE_CONTENT_EMPTY_RESULT:", {
        model: getModel(),
        sourceName: input.name,
      });
    }

    return normalized;
  } catch (error) {
    console.error("GENERATE_RESTAURANT_CHINESE_CONTENT_ERROR:", error);
    return EMPTY_CHINESE_CONTENT;
  }
}

function shouldUseValue(value?: string | null) {
  return Boolean(cleanText(value));
}

export async function buildRestaurantChineseContentPatch(options: {
  source: RestaurantChineseContentInput;
  manual?: Partial<RestaurantChineseContent>;
  existing?: Partial<RestaurantChineseContent>;
  regenerate?: boolean;
}): Promise<RestaurantChineseContentPatch> {
  const manual = options.manual || {};
  const existing = options.existing || {};
  const patch: RestaurantChineseContentPatch = {};
  const missingKeys: Array<keyof RestaurantChineseContent> = [];

  for (const key of RESTAURANT_CHINESE_KEYS) {
    if (shouldUseValue(manual[key])) {
      patch[key] = cleanText(manual[key]);
      continue;
    }

    if (!options.regenerate && shouldUseValue(existing[key])) {
      patch[key] = cleanText(existing[key]);
      continue;
    }

    missingKeys.push(key);
  }

  if (missingKeys.length === 0) {
    return patch;
  }

  const generated = await generateRestaurantChineseContent(options.source);

  for (const key of missingKeys) {
    const generatedValue = cleanText(generated[key]);
    const existingValue = cleanText(existing[key]);

    patch[key] =
      generatedValue || (!options.regenerate ? existingValue : null) || null;
  }

  return patch;
}
