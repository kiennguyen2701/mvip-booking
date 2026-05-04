import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

function normalizeRefCode(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await import("next/headers").then((mod) => mod.cookies());
  const refCode = normalizeRefCode(
    searchParams.get("ref") ||
      cookieStore.get("mvip_ref_code")?.value ||
      cookieStore.get("ref_code")?.value,
  );

  const agent = await resolveAgent(refCode);

  if (user) {
    const now = new Date().toISOString();
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Customer";

    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        full_name: fullName,
        role: user.user_metadata?.role || "customer",
        ref_code: agent?.ref_code || user.user_metadata?.ref_code || null,
        agent_id: agent?.id || user.user_metadata?.agent_id || null,
      },
    });

    await adminClient.from("users").upsert(
      {
        id: user.id,
        full_name: fullName,
        email: user.email || null,
        role: "customer",
        ref_code: agent?.ref_code || null,
        agent_id: agent?.id || null,
        updated_at: now,
      },
      { onConflict: "id" },
    );

    await adminClient.from("profiles").upsert(
      {
        id: user.id,
        email: user.email || null,
        full_name: fullName,
        role: "customer",
        referred_by_ref_code: agent?.ref_code || null,
        referred_by_agent_id: agent?.id || null,
        updated_at: now,
      },
      { onConflict: "id" },
    );
  }

  const response = NextResponse.redirect(`${origin}${next}`);

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
}