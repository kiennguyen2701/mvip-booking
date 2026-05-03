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
  slug text,
  company_name text,
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
    s.id,
    s.slug,
    s.company_name,
    s.short_description,
    s.cover_image,
    coalesce(s.gallery_images, '{}'::text[]) as gallery_images,
    s.city,
    s.address,
    s.price_range,
    coalesce(s.tags, '{}'::text[]) as tags,
    coalesce(s.amenities, '{}'::text[]) as amenities,
    coalesce(s.opening_hours, '{}'::jsonb) as opening_hours,
    s.is_featured
  from public.suppliers s
  where s.is_active = true
    and (
      coalesce(trim(p_query), '') = ''
      or s.company_name ilike '%' || trim(p_query) || '%'
      or coalesce(s.short_description, '') ilike '%' || trim(p_query) || '%'
      or coalesce(s.city, '') ilike '%' || trim(p_query) || '%'
      or exists (
        select 1
        from unnest(coalesce(s.tags, '{}'::text[])) tag
        where tag ilike '%' || trim(p_query) || '%'
      )
      or exists (
        select 1
        from unnest(coalesce(s.amenities, '{}'::text[])) amenity
        where amenity ilike '%' || trim(p_query) || '%'
      )
    )
    and (
      coalesce(trim(p_city), '') = ''
      or coalesce(s.city, '') ilike '%' || trim(p_city) || '%'
    )
    and (
      coalesce(trim(p_tag), '') = ''
      or exists (
        select 1
        from unnest(coalesce(s.tags, '{}'::text[])) tag
        where lower(tag) = lower(trim(p_tag))
      )
    )
    and (
      coalesce(trim(p_price_range), '') = ''
      or coalesce(s.price_range, '') = trim(p_price_range)
    )
  order by
    s.is_featured desc,
    s.updated_at desc nulls last,
    s.created_at desc nulls last
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

grant execute on function public.get_public_restaurants(text, text, text, text, integer)
to anon, authenticated;

commit;