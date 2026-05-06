create table public.auctions (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references public.listings(id) on delete cascade unique not null,
  start_price numeric(10,2) not null check (start_price > 0),
  current_bid numeric(10,2),
  bid_count integer default 0,
  winner_id uuid references public.profiles(id),
  ends_at timestamptz not null,
  created_at timestamptz default now()
);

create table public.bids (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references public.auctions(id) on delete cascade not null,
  bidder_id uuid references public.profiles(id) not null,
  amount numeric(10,2) not null,
  created_at timestamptz default now()
);

alter table public.auctions enable row level security;
alter table public.bids enable row level security;

create policy "Auctions readable" on public.auctions for select using (true);
create policy "Bids readable" on public.bids for select using (true);
create policy "Authenticated users bid" on public.bids for insert with check (auth.uid() = bidder_id);

-- Enable realtime for auctions
alter publication supabase_realtime add table public.auctions;
alter publication supabase_realtime add table public.bids;
