// lib/email/process-email-jobs-helper.ts
//
// Dùng chung cho supplier actions và admin actions.
// Thay thế triggerEmailWorker() — không HTTP fetch, process trực tiếp trong request.
// Giống pattern đã dùng trong api/booking/create/route.ts.

import { adminClient } from "@/lib/supabase/admin";
import { processEmailJob } from "@/lib/email/process-email-job";

export async function processEmailJobsForBooking(bookingId: string) {
  // Lấy tất cả pending jobs của booking này
  const { data: jobs, error } = await adminClient
    .from("email_jobs")
    .select("id, type, payload, attempts, max_attempts")
    .eq("booking_id", bookingId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !jobs?.length) return;

  for (const job of jobs) {
    try {
      // Lock job
      const { data: locked } = await adminClient
        .from("email_jobs")
        .update({
          status: "processing",
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("status", "pending") // chỉ lock nếu vẫn pending
        .select("id, type, payload")
        .maybeSingle();

      if (!locked) continue; // đã được process bởi request khác

      await processEmailJob({
        id: locked.id,
        type: String(locked.type),
        payload: (locked.payload || {}) as Record<string, unknown>,
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

      console.log("EMAIL_JOB_SENT:", job.id, job.type);
    } catch (err) {
      console.error("EMAIL_JOB_ERROR:", job.id, err);

      const attempts = Number(job.attempts || 0) + 1;
      const maxAttempts = Number(job.max_attempts || 5);

      await adminClient
        .from("email_jobs")
        .update({
          status: attempts >= maxAttempts ? "failed" : "pending",
          attempts,
          updated_at: new Date().toISOString(),
          last_error: err instanceof Error ? err.message : "Unknown error",
          locked_at: null,
        })
        .eq("id", job.id);
    }
  }
}