import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PreferredLanguage = "en" | "zh";

function normalizeRefCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function normalizePreferredLanguage(value: unknown): PreferredLanguage {
  return String(value || "").trim().toLowerCase() === "zh" ? "zh" : "en";
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
          phone: phone || null,
          whatsapp: whatsapp || null,
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

    const userId = authUser.user.id;
    const now = new Date().toISOString();

    const { error: userError } = await adminClient.from("users").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        name: fullName,
        phone: phone || null,
        whatsapp: whatsapp || null,
        role: "customer",
        agent_id: agent?.id || null,
        ref_code: agent?.ref_code || null,
        preferred_language: preferredLanguage,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (userError) {
      console.error("CUSTOMER_REGISTER_USERS_UPSERT_ERROR:", userError);
      await adminClient.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: userError.message },
        { status: 400 },
      );
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        whatsapp: whatsapp || null,
        role: "customer",
        referred_by_agent_id: agent?.id || null,
        referred_by_ref_code: agent?.ref_code || null,
        preferred_language: preferredLanguage,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      console.error("CUSTOMER_REGISTER_PROFILES_UPSERT_ERROR:", profileError);
      await adminClient.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: profileError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      preferredLanguage,
      referredByAgentId: agent?.id || null,
      referredByRefCode: agent?.ref_code || null,
    });
  } catch (error) {
    console.error("CUSTOMER_REGISTER_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to register customer." },
      { status: 500 },
    );
  }
}
