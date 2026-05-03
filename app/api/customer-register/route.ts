import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // 1. Create auth user
    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authUser?.user) {
      return NextResponse.json(
        { error: authError?.message || "Cannot create user." },
        { status: 400 }
      );
    }

    // 2. Insert into users table
    const { error: insertError } = await adminClient.from("users").insert({
      id: authUser.user.id,
      full_name: fullName,
      email,
      role: "customer",
      whatsapp: whatsapp || null,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 }
    );
  }
}