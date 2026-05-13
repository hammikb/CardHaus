alter table public.orders
  drop constraint if exists orders_listing_id_key;

drop index if exists public.orders_listing_id_key;

alter table public.orders
  add column if not exists quantity int not null default 1 check (quantity > 0),
  add column if not exists unit_price numeric(10,2),
  add column if not exists market_context jsonb;

update public.orders
set unit_price = total
where unit_price is null;

alter table public.orders
  alter column unit_price set not null;

create table if not exists public.market_snapshots (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid references public.cards(id) on delete cascade not null,
  card_variant_id uuid references public.card_variants(id) on delete cascade,
  source text not null,
  label text not null,
  price numeric(10,2) not null check (price > 0),
  url text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_market_snapshots_card_id on public.market_snapshots(card_id, captured_at desc);
create index if not exists idx_market_snapshots_variant_id on public.market_snapshots(card_variant_id, captured_at desc);

create or replace function public.apply_listing_purchase(p_listing_id uuid, p_purchase_quantity int)
returns table (quantity int, status text)
language plpgsql
security definer
as $$
declare
  current_quantity int;
  next_quantity int;
  next_status text;
begin
  if p_purchase_quantity is null or p_purchase_quantity < 1 then
    raise exception 'Purchase quantity must be at least 1';
  end if;

  select l.quantity
  into current_quantity
  from public.listings l
  where l.id = p_listing_id
  for update;

  if current_quantity is null then
    raise exception 'Listing not found';
  end if;

  if current_quantity < p_purchase_quantity then
    raise exception 'Insufficient quantity available';
  end if;

  next_quantity := current_quantity - p_purchase_quantity;
  next_status := case when next_quantity = 0 then 'sold' else 'active' end;

  update public.listings
  set quantity = next_quantity,
      status = next_status
  where id = p_listing_id;

  return query
  select next_quantity, next_status;
end;
$$;

alter table public.market_snapshots enable row level security;

drop policy if exists "Market snapshots are publicly readable" on public.market_snapshots;
create policy "Market snapshots are publicly readable"
  on public.market_snapshots
  for select
  using (true);

drop policy if exists "Service can insert market snapshots" on public.market_snapshots;
create policy "Service can insert market snapshots"
  on public.market_snapshots
  for insert
  with check (true);
