import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { processEmailJob } from "@/lib/email/process-email-job";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BATCH_SIZE = 25;

type EmailJobRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number | null;
  max_attempts: number | null;
};

function getNextScheduledAt(attempts: number) {
  const seconds = Math.min(60 * 30, Math.max(30, attempts * attempts * 30));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.EMAIL_QUEUE_SECRET;

  if (!secret) return true;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const authorization = request.headers.get("authorization") || "";

  return querySecret === secret || authorization === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: jobs, error } = await adminClient
    .from("email_jobs")
    .select("id, type, payload, attempts, max_attempts")
    .in("status", ["pending", "failed"])
    .lte("scheduled_at", now)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!jobs?.length) {
    return NextResponse.json({
      success: true,
      processed: 0,
      message: "No pending email jobs.",
    });
  }

  let sent = 0;
  let failed = 0;

  for (const job of jobs as EmailJobRow[]) {
    const lockTime = new Date().toISOString();

    await adminClient
      .from("email_jobs")
      .update({
        status: "processing",
        locked_at: lockTime,
        updated_at: lockTime,
      })
      .eq("id", job.id);

    try {
      await processEmailJob({
        id: job.id,
        type: String(job.type),
        payload: (job.payload || {}) as Record<string, unknown>,
      });

      await adminClient
        .from("email_jobs")
        .update({
          status: "sent",
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", job.id);

      sent += 1;
    } catch (error) {
      const attempts = Number(job.attempts || 0) + 1;
      const maxAttempts = Number(job.max_attempts || 5);
      const finalFailed = attempts >= maxAttempts;

      await adminClient
        .from("email_jobs")
        .update({
          status: finalFailed ? "failed" : "pending",
          attempts,
          scheduled_at: finalFailed
            ? new Date().toISOString()
            : getNextScheduledAt(attempts),
          updated_at: new Date().toISOString(),
          last_error:
            error instanceof Error ? error.message : "Unknown email job error",
        })
        .eq("id", job.id);

      failed += 1;
    }
  }

  return NextResponse.json({
    success: true,
    processed: jobs.length,
    sent,
    failed,
  });
}

export async function GET(request: Request) {
  return POST(request);
}