import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from:
        process.env.BOOKING_FROM_EMAIL ||
        "Mvip Booking <onboarding@resend.dev>",
      to: process.env.ADMIN_EMAIL || "kiennguyen.vnnumber1@gmail.com",
      subject: "Mvip Booking - Resend Test Email",
      html: `
        <h2>Resend test email</h2>
        <p>If you receive this email, Resend is working correctly.</p>
      `,
    });

    console.log("RESEND_TEST_RESULT:", result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("RESEND_TEST_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}