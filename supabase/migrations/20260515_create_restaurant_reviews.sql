create table if not exists public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,

  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) <= 200),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint restaurant_reviews_one_per_booking unique (booking_id),
  constraint restaurant_reviews_one_user_booking unique (customer_id, booking_id)
);

create index if not exists restaurant_reviews_restaurant_created_idx
on public.restaurant_reviews (restaurant_id, created_at desc);

create index if not exists restaurant_reviews_restaurant_rating_idx
on public.restaurant_reviews (restaurant_id, rating);

alter table public.restaurant_reviews enable row level security;

drop policy if exists "Public can read restaurant reviews" on public.restaurant_reviews;

create policy "Public can read restaurant reviews"
on public.restaurant_reviews
for select
using (true);