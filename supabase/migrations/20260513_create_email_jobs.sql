create table if not exists public.email_jobs (
  id uuid primary key default gen_random_uuid(),

  type text not null,
  booking_id uuid null references public.bookings(id) on delete set null,
  dedupe_key text not null unique,

  payload jsonb not null,

  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),

  attempts integer not null default 0,
  max_attempts integer not null default 5,

  scheduled_at timestamptz not null default now(),
  locked_at timestamptz null,
  processed_at timestamptz null,
  last_error text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_jobs_status_scheduled_at_idx
on public.email_jobs(status, scheduled_at);

create index if not exists email_jobs_booking_id_idx
on public.email_jobs(booking_id);

create index if not exists email_jobs_created_at_idx
on public.email_jobs(created_at desc);

alter table public.email_jobs disable row level security;