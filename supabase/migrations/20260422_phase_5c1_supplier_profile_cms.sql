begin;

-- ============================================
-- Phase 5C.1 - Supplier Profile CMS
-- Expand current suppliers table safely
-- ============================================

alter table public.suppliers
  add column if not exists slug text,
  add column if not exists short_description text,
  add column if not exists full_description text,
  add column if not exists cover_image text,
  add column if not exists gallery_images text[] not null default '{}'::text[],
  add column if not exists whatsapp text,
  add column if not exists opening_hours jsonb not null default '{}'::jsonb,
  add column if not exists price_range text,
  add column if not exists amenities text[] not null default '{}'::text[],
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists is_active boolean not null default true,
  add column if not exists is_featured boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists suppliers_slug_unique_idx
  on public.suppliers (slug)
  where slug is not null and btrim(slug) <> '';

-- ============================================
-- Version history table for supplier content
-- ============================================

create table if not exists public.supplier_content_versions (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  company_name text,
  contact_name text,
  phone text,
  email text,
  address text,
  city text,
  slug text,
  short_description text,
  full_description text,
  cover_image text,
  gallery_images text[] not null default '{}'::text[],
  whatsapp text,
  opening_hours jsonb not null default '{}'::jsonb,
  price_range text,
  amenities text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  latitude numeric(10,7),
  longitude numeric(10,7),
  updated_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists supplier_content_versions_supplier_id_created_at_idx
  on public.supplier_content_versions (supplier_id, created_at desc);

-- ============================================
-- updated_at trigger
-- ============================================

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_suppliers_set_updated_at on public.suppliers;
create trigger trg_suppliers_set_updated_at
before update on public.suppliers
for each row
execute function public.set_updated_at_timestamp();

-- ============================================
-- version log trigger
-- ============================================

create or replace function public.log_supplier_content_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  begin
    v_user_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  exception
    when others then
      v_user_id := null;
  end;

  insert into public.supplier_content_versions (
    supplier_id,
    company_name,
    contact_name,
    phone,
    email,
    address,
    city,
    slug,
    short_description,
    full_description,
    cover_image,
    gallery_images,
    whatsapp,
    opening_hours,
    price_range,
    amenities,
    tags,
    latitude,
    longitude,
    updated_by
  )
  values (
    new.id,
    new.company_name,
    new.contact_name,
    new.phone,
    new.email,
    new.address,
    new.city,
    new.slug,
    new.short_description,
    new.full_description,
    new.cover_image,
    coalesce(new.gallery_images, '{}'::text[]),
    new.whatsapp,
    coalesce(new.opening_hours, '{}'::jsonb),
    new.price_range,
    coalesce(new.amenities, '{}'::text[]),
    coalesce(new.tags, '{}'::text[]),
    new.latitude,
    new.longitude,
    v_user_id
  );

  return new;
end;
$$;

drop trigger if exists trg_suppliers_log_content_version on public.suppliers;
create trigger trg_suppliers_log_content_version
after update on public.suppliers
for each row
execute function public.log_supplier_content_version();

-- ============================================
-- RLS for supplier_content_versions
-- suppliers table may already have RLS/policies in project
-- only add missing safe read policy for history table
-- ============================================

alter table public.supplier_content_versions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'supplier_content_versions'
      and policyname = 'supplier_can_read_own_content_versions'
  ) then
    create policy supplier_can_read_own_content_versions
    on public.supplier_content_versions
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.suppliers s
        where s.id = supplier_content_versions.supplier_id
          and s.user_id = auth.uid()
      )
    );
  end if;
end
$$;

commit;