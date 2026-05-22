import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { processEmailJob } from "@/lib/email/process-email-job";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BATCH_SIZE = 25;
const STALE_PROCESSING_MINUTES = 5;

type EmailJobStatus = "pending" | "processing" | "sent" | "failed";

type EmailJobRow = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  status: EmailJobStatus;
  attempts: number | null;
  max_attempts: number | null;
  locked_at: string | null;
};

function getNextScheduledAt(attempts: number) {
  const seconds = Math.min(60 * 30, Math.max(30, attempts * attempts * 30));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function getStaleProcessingCutoff() {
  return new Date(
    Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000,
  ).toISOString();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown email job error";
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.EMAIL_QUEUE_SECRET;

  if (!secret) return true;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const authorization = request.headers.get("authorization") || "";

  return querySecret === secret || authorization === `Bearer ${secret}`;
}

function canRetryJob(job: EmailJobRow) {
  const attempts = Number(job.attempts || 0);
  const maxAttempts = Number(job.max_attempts || 5);

  return attempts < maxAttempts;
}

async function getDueJobs() {
  const now = new Date().toISOString();
  const staleCutoff = getStaleProcessingCutoff();

  const { data: scheduledJobs, error: scheduledError } = await adminClient
    .from("email_jobs")
    .select("id, type, payload, status, attempts, max_attempts, locked_at")
    .in("status", ["pending", "failed"])
    .lte("scheduled_at", now)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (scheduledError) {
    throw scheduledError;
  }

  const remainingLimit = Math.max(
    0,
    BATCH_SIZE - Number(scheduledJobs?.length || 0),
  );

  let staleJobs: EmailJobRow[] = [];

  if (remainingLimit > 0) {
    const { data, error } = await adminClient
      .from("email_jobs")
      .select("id, type, payload, status, attempts, max_attempts, locked_at")
      .eq("status", "processing")
      .lt("locked_at", staleCutoff)
      .order("created_at", { ascending: true })
      .limit(remainingLimit);

    if (error) {
      throw error;
    }

    staleJobs = (data || []) as EmailJobRow[];
  }

  const jobMap = new Map<string, EmailJobRow>();

  for (const job of [...((scheduledJobs || []) as EmailJobRow[]), ...staleJobs]) {
    if (canRetryJob(job)) {
      jobMap.set(job.id, job);
    }
  }

  return Array.from(jobMap.values());
}

async function lockJob(job: EmailJobRow) {
  const lockTime = new Date().toISOString();

  const { data, error } = await adminClient
    .from("email_jobs")
    .update({
      status: "processing",
      locked_at: lockTime,
      updated_at: lockTime,
    })
    .eq("id", job.id)
    .neq("status", "sent")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("EMAIL_JOB_LOCK_ERROR:", job.id, error.message);
    return false;
  }

  return Boolean(data?.id);
}

async function markJobSent(jobId: string) {
  const now = new Date().toISOString();

  const { error } = await adminClient
    .from("email_jobs")
    .update({
      status: "sent",
      processed_at: now,
      updated_at: now,
      last_error: null,
    })
    .eq("id", jobId);

  if (error) {
    throw error;
  }
}

async function markJobFailed(job: EmailJobRow, error: unknown) {
  const attempts = Number(job.attempts || 0) + 1;
  const maxAttempts = Number(job.max_attempts || 5);
  const finalFailed = attempts >= maxAttempts;
  const now = new Date().toISOString();

  const { error: updateError } = await adminClient
    .from("email_jobs")
    .update({
      status: finalFailed ? "failed" : "pending",
      attempts,
      scheduled_at: finalFailed ? now : getNextScheduledAt(attempts),
      updated_at: now,
      last_error: getErrorMessage(error),
      locked_at: null,
    })
    .eq("id", job.id);

  if (updateError) {
    console.error("EMAIL_JOB_MARK_FAILED_ERROR:", job.id, updateError.message);
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await getDueJobs();

    if (!jobs.length) {
      return NextResponse.json({
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        message: "No pending email jobs.",
      });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const job of jobs) {
      const locked = await lockJob(job);

      if (!locked) {
        skipped += 1;
        continue;
      }

      try {
        await processEmailJob({
          id: job.id,
          type: String(job.type),
          payload: (job.payload || {}) as Record<string, unknown>,
        });

        await markJobSent(job.id);
        sent += 1;
      } catch (error) {
        console.error("EMAIL_JOB_PROCESS_ERROR:", job.id, error);
        await markJobFailed(job, error);
        failed += 1;
      }
    }

    return NextResponse.json({
      success: true,
      processed: jobs.length,
      sent,
      failed,
      skipped,
    });
  } catch (error) {
    console.error("EMAIL_PROCESS_ROUTE_ERROR:", error);

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}