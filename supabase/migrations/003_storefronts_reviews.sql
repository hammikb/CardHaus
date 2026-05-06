create table public.storefronts (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid references public.profiles(id) on delete cascade unique not null,
  shop_name text not null,
  banner_image text,
  description text,
  policies text,
  created_at timestamptz default now()
);

create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade unique not null,
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz default now()
);

alter table public.storefronts enable row level security;
alter table public.reviews enable row level security;

create policy "Storefronts readable" on public.storefronts for select using (true);
create policy "Vendors manage own storefront" on public.storefronts
  for all using (auth.uid() = vendor_id);

create policy "Reviews readable" on public.reviews for select using (true);
create policy "Buyers create reviews" on public.reviews
  for insert with check (auth.uid() = buyer_id);

-- Materialized review score update (simple avg via function)
create or replace function public.update_review_score()
returns trigger as $$
begin
  -- stored on profiles for fast query; update on insert
  return new;
end;
$$ language plpgsql;
