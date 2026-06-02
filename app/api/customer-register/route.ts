import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

type PreferredLanguage = "en" | "zh";

function normalizeRefCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function normalizePreferredLanguage(value: unknown): PreferredLanguage {
  return value === "zh" ? "zh" : "en";
}

function getCookieValue(cookieHeader: string, name: string) {
  const target = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!target) return "";

  return decodeURIComponent(target.slice(name.length + 1));
}

async function resolveAgent(refCode: string) {
  if (!refCode) return null;

  const { data } = await adminClient
    .from("agents")
    .select("id, ref_code, is_active")
    .eq("ref_code", refCode)
    .maybeSingle();

  if (!data || data.is_active === false) return null;

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    const [ipLimit, globalLimit] = await Promise.all([
      rateLimit({
        key: `register:ip:${clientIp}`,
        limit: 5,
        windowMs: 60 * 60 * 1000, // 5 lần / giờ / IP
      }),
      rateLimit({
        key: `register:global`,
        limit: 100,
        windowMs: 60 * 60 * 1000, // 100 tài khoản / giờ toàn hệ thống
      }),
    ]);

    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 },
      );
    }

    if (!globalLimit.success) {
      return NextResponse.json(
        { error: "Registration temporarily unavailable. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const url = new URL(request.url);
    const cookieHeader = request.headers.get("cookie") || "";

    const fullName = String(body.fullName || body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const phone = String(body.phone || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();
    const preferredLanguage = normalizePreferredLanguage(
      body.preferredLanguage || body.preferred_language,
    );

    const rawRefCode =
      body.refCode ||
      body.ref_code ||
      body.ref ||
      url.searchParams.get("ref") ||
      url.searchParams.get("code") ||
      getCookieValue(cookieHeader, "mvip_ref_code") ||
      getCookieValue(cookieHeader, "ref_code");

    const refCode = normalizeRefCode(rawRefCode);
    const agent = await resolveAgent(refCode);

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: "customer",
          preferred_language: preferredLanguage,
          ref_code: agent?.ref_code || null,
          agent_id: agent?.id || null,
        },
      });

    if (authError || !authUser?.user) {
      return NextResponse.json(
        { error: authError?.message || "Cannot create user." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    const { error: userError } = await adminClient.from("users").upsert(
      {
        id: authUser.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        role: "customer",
        preferred_language: preferredLanguage,
        ref_code: agent?.ref_code || null,
        agent_id: agent?.id || null,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 400 },
      );
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: authUser.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        whatsapp: whatsapp || null,
        role: "customer",
        preferred_language: preferredLanguage,
        referred_by_ref_code: agent?.ref_code || null,
        referred_by_agent_id: agent?.id || null,
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      success: true,
      autoLogin: true,
      userId: authUser.user.id,
      refCode: agent?.ref_code || null,
      agentId: agent?.id || null,
      preferredLanguage,
    });

    if (agent?.ref_code) {
      response.cookies.set("mvip_ref_code", agent.ref_code, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });

      response.cookies.set("ref_code", agent.ref_code, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    console.error("CUSTOMER_REGISTER_ERROR:", error);

    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 },
    );
  }
}