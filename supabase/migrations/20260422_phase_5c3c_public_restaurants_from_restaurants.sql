begin;

create or replace function public.get_public_restaurants(
  p_query text default null,
  p_city text default null,
  p_tag text default null,
  p_price_range text default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  supplier_id uuid,
  slug text,
  name text,
  short_description text,
  cover_image text,
  gallery_images text[],
  city text,
  address text,
  price_range text,
  tags text[],
  amenities text[],
  opening_hours jsonb,
  is_featured boolean
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.supplier_id,
    r.slug,
    r.name,
    r.short_description,
    r.cover_image,
    coalesce(r.gallery_images, '{}'::text[]) as gallery_images,
    r.city,
    r.address,
    r.price_range,
    coalesce(r.tags, '{}'::text[]) as tags,
    coalesce(r.amenities, '{}'::text[]) as amenities,
    coalesce(r.opening_hours, '{}'::jsonb) as opening_hours,
    coalesce(r.is_featured, false) as is_featured
  from public.restaurants r
  where coalesce(r.is_active, true) = true
    and (
      coalesce(trim(p_query), '') = ''
      or coalesce(r.name, '') ilike '%' || trim(p_query) || '%'
      or coalesce(r.short_description, '') ilike '%' || trim(p_query) || '%'
      or coalesce(r.city, '') ilike '%' || trim(p_query) || '%'
      or coalesce(r.address, '') ilike '%' || trim(p_query) || '%'
      or exists (
        select 1
        from unnest(coalesce(r.tags, '{}'::text[])) tag
        where tag ilike '%' || trim(p_query) || '%'
      )
      or exists (
        select 1
        from unnest(coalesce(r.amenities, '{}'::text[])) amenity
        where amenity ilike '%' || trim(p_query) || '%'
      )
    )
    and (
      coalesce(trim(p_city), '') = ''
      or coalesce(r.city, '') ilike '%' || trim(p_city) || '%'
    )
    and (
      coalesce(trim(p_tag), '') = ''
      or exists (
        select 1
        from unnest(coalesce(r.tags, '{}'::text[])) tag
        where lower(tag) = lower(trim(p_tag))
      )
    )
    and (
      coalesce(trim(p_price_range), '') = ''
      or coalesce(r.price_range, '') = trim(p_price_range)
    )
  order by
    coalesce(r.is_featured, false) desc,
    r.updated_at desc nulls last,
    r.created_at desc nulls last,
    r.name asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

grant execute on function public.get_public_restaurants(text, text, text, text, integer)
to anon, authenticated;

commit;