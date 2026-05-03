create extension if not exists pgcrypto;

create or replace function public.generate_booking_code()
returns text
language plpgsql
as $$
declare
  next_num integer;
begin
  select coalesce(max(right(booking_code, 6)::int), 0) + 1
  into next_num
  from public.bookings
  where booking_code like 'MVP%';

  return 'MVP' || lpad(next_num::text, 6, '0');
exception
  when others then
    return 'MVP000001';
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'customer' check (role in ('admin','supplier','agent','customer')),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  company_name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  ref_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  category text,
  city text,
  address text,
  price_from numeric(12,2),
  cover_image text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique default public.generate_booking_code(),
  customer_id uuid references public.profiles(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  ref_code text,
  booking_date date not null,
  booking_time text not null,
  guest_count integer not null default 1,
  note text,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,
  fixed_amount numeric(12,2) default 0,
  percent_amount numeric(5,2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.commission_transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique references public.bookings(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  total_commission numeric(12,2) default 0,
  agent_commission numeric(12,2) default 0,
  platform_commission numeric(12,2) default 0,
  payout_status text not null default 'unpaid' check (payout_status in ('unpaid','processing','paid')),
  created_at timestamptz not null default now()
);

create or replace function public.set_booking_supplier()
returns trigger
language plpgsql
as $$
begin
  if new.restaurant_id is not null and new.supplier_id is null then
    select supplier_id into new.supplier_id
    from public.restaurants
    where id = new.restaurant_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_booking_supplier on public.bookings;

create trigger trg_set_booking_supplier
before insert on public.bookings
for each row execute function public.set_booking_supplier();

alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.agents enable row level security;
alter table public.restaurants enable row level security;
alter table public.bookings enable row level security;
alter table public.commission_rules enable row level security;
alter table public.commission_transactions enable row level security;

drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
for update to authenticated
using (auth.uid() = id);

drop policy if exists "restaurants public read" on public.restaurants;
create policy "restaurants public read" on public.restaurants
for select
using (is_active = true);

drop policy if exists "bookings own insert" on public.bookings;
create policy "bookings own insert" on public.bookings
for insert to authenticated
with check (auth.uid() = customer_id);

drop policy if exists "bookings customer read" on public.bookings;
create policy "bookings customer read" on public.bookings
for select to authenticated
using (auth.uid() = customer_id);

drop policy if exists "agents own read" on public.agents;
create policy "agents own read" on public.agents
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "suppliers own read" on public.suppliers;
create policy "suppliers own read" on public.suppliers
for select to authenticated
using (auth.uid() = user_id);