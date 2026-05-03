begin;

-- =====================================================
-- 1) Main restaurants table
-- =====================================================

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  name text not null,
  slug text not null,
  short_description text,
  full_description text,

  cover_image text,
  gallery_images text[] not null default '{}'::text[],

  address text,
  city text,
  latitude numeric(10,7),
  longitude numeric(10,7),

  phone text,
  whatsapp text,

  opening_hours jsonb not null default '{}'::jsonb,
  price_range text,
  tags text[] not null default '{}'::text[],
  amenities text[] not null default '{}'::text[],

  is_active boolean not null default true,
  is_featured boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists restaurants_slug_unique_idx
  on public.restaurants (slug);

create index if not exists restaurants_supplier_id_idx
  on public.restaurants (supplier_id);

create index if not exists restaurants_is_active_idx
  on public.restaurants (is_active);

-- =====================================================
-- 2) Version history table
-- =====================================================

create table if not exists public.restaurant_content_versions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  name text,
  slug text,
  short_description text,
  full_description text,
  cover_image text,
  gallery_images text[] not null default '{}'::text[],

  address text,
  city text,
  latitude numeric(10,7),
  longitude numeric(10,7),

  phone text,
  whatsapp text,
  opening_hours jsonb not null default '{}'::jsonb,
  price_range text,
  tags text[] not null default '{}'::text[],
  amenities text[] not null default '{}'::text[],

  is_active boolean not null default true,
  is_featured boolean not null default false,

  updated_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_content_versions_restaurant_id_idx
  on public.restaurant_content_versions (restaurant_id, created_at desc);

-- =====================================================
-- 3) updated_at trigger
-- =====================================================

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_restaurants_set_updated_at on public.restaurants;
create trigger trg_restaurants_set_updated_at
before update on public.restaurants
for each row
execute function public.set_updated_at_timestamp();

-- =====================================================
-- 4) version log trigger
-- =====================================================

create or replace function public.log_restaurant_content_version()
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

  insert into public.restaurant_content_versions (
    restaurant_id,
    supplier_id,
    name,
    slug,
    short_description,
    full_description,
    cover_image,
    gallery_images,
    address,
    city,
    latitude,
    longitude,
    phone,
    whatsapp,
    opening_hours,
    price_range,
    tags,
    amenities,
    is_active,
    is_featured,
    updated_by
  )
  values (
    new.id,
    new.supplier_id,
    new.name,
    new.slug,
    new.short_description,
    new.full_description,
    new.cover_image,
    coalesce(new.gallery_images, '{}'::text[]),
    new.address,
    new.city,
    new.latitude,
    new.longitude,
    new.phone,
    new.whatsapp,
    coalesce(new.opening_hours, '{}'::jsonb),
    new.price_range,
    coalesce(new.tags, '{}'::text[]),
    coalesce(new.amenities, '{}'::text[]),
    new.is_active,
    new.is_featured,
    v_user_id
  );

  return new;
end;
$$;

drop trigger if exists trg_restaurants_log_content_version on public.restaurants;
create trigger trg_restaurants_log_content_version
after update on public.restaurants
for each row
execute function public.log_restaurant_content_version();

-- =====================================================
-- 5) RLS
-- =====================================================

alter table public.restaurants enable row level security;
alter table public.restaurant_content_versions enable row level security;

drop policy if exists "supplier_can_read_own_restaurants" on public.restaurants;
create policy "supplier_can_read_own_restaurants"
on public.restaurants
for select
to authenticated
using (
  exists (
    select 1
    from public.suppliers s
    where s.id = restaurants.supplier_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "supplier_can_insert_own_restaurants" on public.restaurants;
create policy "supplier_can_insert_own_restaurants"
on public.restaurants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.suppliers s
    where s.id = restaurants.supplier_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "supplier_can_update_own_restaurants" on public.restaurants;
create policy "supplier_can_update_own_restaurants"
on public.restaurants
for update
to authenticated
using (
  exists (
    select 1
    from public.suppliers s
    where s.id = restaurants.supplier_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.suppliers s
    where s.id = restaurants.supplier_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "supplier_can_read_own_restaurant_versions" on public.restaurant_content_versions;
create policy "supplier_can_read_own_restaurant_versions"
on public.restaurant_content_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.suppliers s
    where s.id = restaurant_content_versions.supplier_id
      and s.user_id = auth.uid()
  )
);

-- =====================================================
-- 6) Backfill current supplier profile -> first restaurant row
--    Only insert if supplier has no restaurant yet
-- =====================================================

insert into public.restaurants (
  supplier_id,
  name,
  slug,
  short_description,
  full_description,
  cover_image,
  gallery_images,
  address,
  city,
  latitude,
  longitude,
  phone,
  whatsapp,
  opening_hours,
  price_range,
  tags,
  amenities,
  is_active,
  is_featured
)
select
  s.id as supplier_id,
  coalesce(nullif(trim(s.company_name), ''), 'Restaurant') as name,
  coalesce(
    nullif(trim(s.slug), ''),
    lower(regexp_replace(coalesce(nullif(trim(s.company_name), ''), 'restaurant'), '[^a-zA-Z0-9]+', '-', 'g'))
  ) as slug,
  s.short_description,
  s.full_description,
  s.cover_image,
  coalesce(s.gallery_images, '{}'::text[]),
  s.address,
  s.city,
  s.latitude,
  s.longitude,
  s.phone,
  s.whatsapp,
  coalesce(s.opening_hours, '{}'::jsonb),
  s.price_range,
  coalesce(s.tags, '{}'::text[]),
  coalesce(s.amenities, '{}'::text[]),
  coalesce(s.is_active, true),
  coalesce(s.is_featured, false)
from public.suppliers s
where not exists (
  select 1
  from public.restaurants r
  where r.supplier_id = s.id
);

commit;