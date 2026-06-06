"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicRestaurants } from "@/lib/restaurants/get-public-restaurants";
import type { PublicRestaurant } from "@/lib/restaurants/get-public-restaurants";

// ─── Rate limit (no cost, but still protect server) ─────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count += 1;
  return true;
}

// ─── Language detection ──────────────────────────────────────────────────────
type Lang = "en" | "zh";

function detectLang(query: string): Lang {
  return /[一-鿿㐀-䶿]/.test(query) ? "zh" : "en";
}

// ─── Keyword dictionaries (EN + ZH) ──────────────────────────────────────────

/** Cuisine type → keywords that signal user wants this cuisine */
const CUISINE_KEYWORDS: Record<string, string[]> = {
  steak: [
    "steak", "steakhouse", "beef", "wagyu", "ribeye", "sirloin",
    "牛排", "牛扒", "和牛", "烤牛",
  ],
  seafood: [
    "seafood", "fish", "lobster", "crab", "shrimp", "oyster", "sashimi",
    "海鲜", "海产", "龙虾", "螃蟹", "生蚝", "鱼",
  ],
  buffet: [
    "buffet", "all you can eat", "unlimited", "self-service", "smorgasbord",
    "自助餐", "自助", "吃到饱", "无限量",
  ],
  vietnamese: [
    "vietnamese", "viet", "pho", "banh mi",
    "越南", "越南菜", "越南料理", "越南美食",
  ],
  european: [
    "european", "western", "french", "italian", "mediterranean",
    "continental", "pasta", "pizza",
    "欧式", "西餐", "法式", "意式", "意大利", "法国", "地中海",
  ],
  japanese: [
    "japanese", "japan", "sushi", "ramen", "sashimi", "tempura", "yakitori",
    "日式", "日本", "寿司", "拉面", "刺身", "天妇罗",
  ],
  chinese: [
    "chinese", "dim sum", "cantonese", "szechuan", "hotpot",
    "中餐", "中式", "点心", "粤菜", "川菜", "火锅",
  ],
  korean: [
    "korean", "korea", "kbbq", "bibimbap", "kimchi",
    "韩式", "韩国", "韩餐", "烤肉", "拌饭",
  ],
  international: [
    "international", "fusion", "world cuisine", "multi-cuisine",
    "国际", "融合", "多国料理", "创意料理",
  ],
};

/** Features: rooftop */
const KW_ROOFTOP = [
  "rooftop", "roof top", "rooftop bar", "sky bar", "skybar",
  "terrace", "open air", "outdoor", "alfresco", "sky lounge", "penthouse",
  "屋顶", "天台", "露台", "楼顶", "空中", "高空", "空中花园", "露天",
];

/** Features: fine dining */
const KW_FINE_DINING = [
  "fine dining", "fine-dining", "upscale", "gourmet", "michelin",
  "high-end", "high end", "elegant", "luxury dining", "tasting menu",
  "精致餐饮", "高端", "精品", "米其林", "顶级", "奢华餐厅", "优雅",
];

/** Features: buffet */
const KW_BUFFET = [
  "buffet", "all you can eat", "unlimited food", "self-service dining",
  "自助餐", "自助", "吃到饱",
];

/** View */
const KW_VIEW = [
  "view", "city view", "panoramic", "scenic", "overlook", "skyline",
  "景观", "城市景观", "全景", "景色", "风景", "城景", "远眺",
];

/** Private room */
const KW_PRIVATE = [
  "private room", "private dining", "vip room", "exclusive",
  "包间", "私人包房", "包房", "独立房间",
];

// ── Atmosphere ──
const KW_ROMANTIC = [
  "romantic", "couple", "date", "date night", "anniversary",
  "intimate", "candlelight", "valentine", "honeymoon",
  "浪漫", "约会", "情侣", "二人世界", "周年纪念", "情人节", "蜜月",
];

const KW_FAMILY = [
  "family", "kids", "children", "family friendly", "family dinner",
  "家庭", "亲子", "家聚", "家庭聚餐", "带孩子", "小孩",
];

const KW_BUSINESS = [
  "business", "corporate", "work dinner", "client dinner",
  "professional", "business meeting", "networking",
  "商务", "商业", "会客", "商务宴请", "商务餐", "公司聚餐",
];

const KW_BIRTHDAY = [
  "birthday", "celebration", "special occasion", "anniversary dinner",
  "party", "event",
  "生日", "庆生", "庆祝", "派对", "纪念日", "特别场合",
];

const KW_GROUP = [
  "group", "large party", "big group", "friends dinner",
  "gathering", "team dinner", "company dinner",
  "聚会", "朋友聚餐", "团体", "大桌", "多人", "团建",
];

// ── Price ──
const KW_BUDGET = [
  "budget", "cheap", "affordable", "inexpensive", "economical",
  "value for money", "low price",
  "便宜", "实惠", "经济", "平价", "划算", "性价比",
];

const KW_MID = [
  "moderate", "mid-range", "reasonable price", "not too expensive",
  "中等", "适中", "中档", "不太贵",
];

const KW_LUXURY = [
  "luxury", "expensive", "splurge", "treat myself",
  "premium", "top-notch", "world-class",
  "豪华", "奢华", "高档", "贵", "高消费", "顶级",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function q(text: string) {
  return text.toLowerCase();
}

/** Does the query string include any of the keywords? */
function queryHas(query: string, keywords: string[]): boolean {
  const lq = q(query);
  return keywords.some((kw) => lq.includes(q(kw)));
}

/** Does ANY of the restaurant text fields include any keyword? */
function restaurantHas(fields: (string | null | undefined)[], keywords: string[]): boolean {
  for (const field of fields) {
    if (!field) continue;
    const lf = q(field);
    if (keywords.some((kw) => lf.includes(q(kw)))) return true;
  }
  return false;
}

/** Collect all searchable text from a restaurant */
function getRestaurantText(r: PublicRestaurant): string[] {
  return [
    r.name,
    r.name_zh,
    r.cuisine_type,
    r.cuisine_type_zh,
    r.category,
    r.category_zh,
    r.short_description,
    r.description,
    r.address,
    r.address_zh,
    r.city,
    r.city_zh,
    r.district,
    ...(Array.isArray(r.tags) ? r.tags : []),
    ...(Array.isArray(r.category_tags) ? r.category_tags : []),
  ];
}

// ─── Score a single restaurant against the query ─────────────────────────────

type MatchTag =
  | `cuisine:${string}`
  | "rooftop"
  | "fine_dining"
  | "buffet"
  | "view"
  | "private"
  | "romantic"
  | "family"
  | "business"
  | "birthday"
  | "group"
  | "budget"
  | "mid_range"
  | "luxury"
  | "general_match";

function scoreRestaurant(
  restaurant: PublicRestaurant,
  query: string,
): { score: number; tags: MatchTag[] } {
  let score = 0;
  const tags: MatchTag[] = [];
  const rText = getRestaurantText(restaurant);

  // ── 1. Cuisine (high weight) ──────────────────────────────────────────────
  for (const [key, kws] of Object.entries(CUISINE_KEYWORDS)) {
    if (queryHas(query, kws)) {
      if (restaurantHas(rText, kws)) {
        score += 55;
        tags.push(`cuisine:${key}` as MatchTag);
      }
    }
  }

  // ── 2. Features ──────────────────────────────────────────────────────────
  if (queryHas(query, KW_ROOFTOP)) {
    if (restaurant.has_rooftop || restaurantHas(rText, KW_ROOFTOP)) {
      score += 50;
      tags.push("rooftop");
    }
  }

  if (queryHas(query, KW_FINE_DINING)) {
    if (restaurant.has_fine_dining || restaurantHas(rText, KW_FINE_DINING)) {
      score += 45;
      tags.push("fine_dining");
    }
  }

  if (queryHas(query, KW_BUFFET)) {
    if (restaurant.has_buffet || restaurantHas(rText, KW_BUFFET)) {
      score += 50;
      tags.push("buffet");
    }
  }

  if (queryHas(query, KW_VIEW)) {
    const hasView =
      restaurant.has_rooftop ||
      restaurantHas(rText, [...KW_ROOFTOP, ...KW_VIEW]);
    if (hasView) {
      score += 20;
      tags.push("view");
    }
  }

  if (queryHas(query, KW_PRIVATE)) {
    if (restaurantHas(rText, KW_PRIVATE)) {
      score += 25;
      tags.push("private");
    }
  }

  // ── 3. Atmosphere ─────────────────────────────────────────────────────────
  if (queryHas(query, KW_ROMANTIC)) {
    const isRomantic =
      restaurantHas(rText, KW_ROMANTIC) ||
      restaurant.has_fine_dining ||
      restaurant.has_rooftop;
    if (isRomantic) {
      score += 35;
      tags.push("romantic");
    }
  }

  if (queryHas(query, KW_BUSINESS)) {
    if (restaurantHas(rText, KW_BUSINESS) || restaurant.has_fine_dining) {
      score += 30;
      tags.push("business");
    }
  }

  if (queryHas(query, KW_FAMILY)) {
    if (restaurantHas(rText, KW_FAMILY) || restaurant.has_buffet) {
      score += 30;
      tags.push("family");
    }
  }

  if (queryHas(query, KW_BIRTHDAY)) {
    if (
      restaurantHas(rText, [...KW_BIRTHDAY, ...KW_ROMANTIC]) ||
      restaurant.has_fine_dining
    ) {
      score += 25;
      tags.push("birthday");
    }
  }

  if (queryHas(query, KW_GROUP)) {
    if (restaurant.has_buffet || restaurantHas(rText, KW_GROUP)) {
      score += 25;
      tags.push("group");
    }
  }

  // ── 4. Price range ────────────────────────────────────────────────────────
  if (queryHas(query, KW_BUDGET)) {
    if (restaurant.price_range === "$" || restaurant.price_range === "$$") {
      score += 25;
      tags.push("budget");
    }
  }

  if (queryHas(query, KW_MID)) {
    if (restaurant.price_range === "$$" || restaurant.price_range === "$$$") {
      score += 20;
      tags.push("mid_range");
    }
  }

  if (queryHas(query, KW_LUXURY)) {
    if (restaurant.price_range === "$$$" || restaurant.price_range === "$$$$") {
      score += 25;
      tags.push("luxury");
    }
  }

  // ── 5. General word overlap ───────────────────────────────────────────────
  // Split query into tokens, match each ≥ 3-char token against restaurant text
  const fullText = rText.filter(Boolean).join(" ").toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/[\s,，。！？!?]+/)
    .filter((t) => t.length >= 3);

  let tokenHits = 0;
  for (const token of tokens) {
    if (fullText.includes(token)) tokenHits++;
  }
  if (tokenHits > 0) {
    score += Math.min(tokenHits * 8, 25);
    tags.push("general_match");
  }

  return { score, tags };
}

// ─── Reason generator ────────────────────────────────────────────────────────

const CUISINE_LABEL: Record<string, Record<Lang, string>> = {
  steak:         { en: "steakhouse",           zh: "牛排餐厅" },
  seafood:       { en: "seafood",               zh: "海鲜美食" },
  buffet:        { en: "buffet dining",         zh: "自助餐" },
  vietnamese:    { en: "Vietnamese cuisine",    zh: "越南菜" },
  european:      { en: "European cuisine",      zh: "欧式西餐" },
  japanese:      { en: "Japanese cuisine",      zh: "日式料理" },
  chinese:       { en: "Chinese cuisine",       zh: "中式餐厅" },
  korean:        { en: "Korean cuisine",        zh: "韩式餐厅" },
  international: { en: "international cuisine", zh: "国际料理" },
};

const TAG_LABEL: Record<string, Record<Lang, string>> = {
  rooftop:       { en: "rooftop / open-air venue",     zh: "屋顶/露台场地" },
  fine_dining:   { en: "upscale fine dining",           zh: "精致高端用餐" },
  buffet:        { en: "buffet style",                  zh: "自助餐形式" },
  view:          { en: "scenic city views",             zh: "享有城市景观" },
  private:       { en: "private dining available",      zh: "提供包间服务" },
  romantic:      { en: "great for romantic occasions",  zh: "适合浪漫约会" },
  business:      { en: "suitable for business dining",  zh: "适合商务宴请" },
  family:        { en: "family-friendly",               zh: "适合家庭聚餐" },
  birthday:      { en: "ideal for celebrations",        zh: "适合庆典聚会" },
  group:         { en: "accommodates large groups",     zh: "可容纳大型聚会" },
  budget:        { en: "budget-friendly pricing",       zh: "价格实惠" },
  mid_range:     { en: "mid-range pricing",             zh: "价格适中" },
  luxury:        { en: "premium / luxury pricing",      zh: "高端奢华定位" },
};

function generateReason(tags: MatchTag[], lang: Lang): string {
  const parts: string[] = [];

  // cuisine first
  for (const tag of tags) {
    if (tag.startsWith("cuisine:")) {
      const key = tag.replace("cuisine:", "");
      const label = CUISINE_LABEL[key]?.[lang];
      if (label) parts.push(label);
      break;
    }
  }

  // then features & atmosphere (up to 2 more)
  for (const tag of tags) {
    if (parts.length >= 3) break;
    if (tag.startsWith("cuisine:") || tag === "general_match") continue;
    const label = TAG_LABEL[tag]?.[lang];
    if (label) parts.push(label);
  }

  if (parts.length === 0) {
    return lang === "zh"
      ? "与您的搜索条件相符"
      : "Matches your search criteria";
  }

  if (lang === "zh") {
    return parts.join("，") + "。";
  }

  const [first, ...rest] = parts;
  const cap = first.charAt(0).toUpperCase() + first.slice(1);
  return rest.length ? `${cap}, ${rest.join(", ")}.` : `${cap}.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to use AI Search." },
        { status: 401 },
      );
    }

    // 2. Rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Too many searches. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    // 3. Parse input
    const body = await req.json();
    const rawQuery = String(body.query || "").trim();

    if (!rawQuery || rawQuery.length < 3) {
      return NextResponse.json(
        { error: "Please describe what you're looking for (at least 3 characters)." },
        { status: 400 },
      );
    }

    if (rawQuery.length > 500) {
      return NextResponse.json(
        { error: "Description too long (max 500 characters)." },
        { status: 400 },
      );
    }

    const lang = detectLang(rawQuery);

    // 4. Fetch restaurants
    const restaurants = await getPublicRestaurants({ limit: 100 });

    if (!restaurants.length) {
      return NextResponse.json({ results: [], query: rawQuery });
    }

    // 5. Score & filter
    const scored = restaurants
      .map((restaurant) => {
        const { score, tags } = scoreRestaurant(restaurant, rawQuery);
        return { restaurant, score, tags };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // 6. Build results
    const results = scored.map(({ restaurant, tags }) => ({
      ...restaurant,
      ai_reason: generateReason(tags, lang),
    }));

    return NextResponse.json({ results, query: rawQuery });
  } catch (err) {
    console.error("AI_SEARCH_ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
