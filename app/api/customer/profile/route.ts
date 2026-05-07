import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          profile: null,
        },
        {
          status: 200,
        },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, whatsapp, email")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      profile: profile || null,
    });
  } catch (error) {
    console.error("CUSTOMER_PROFILE_API_ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to load profile.",
      },
      {
        status: 500,
      },
    );
  }
}