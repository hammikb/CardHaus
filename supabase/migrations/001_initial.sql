-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  username text unique not null,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'vendor', 'admin')),
  stripe_account_id text,
  stripe_onboarded boolean default false,
  verified_vendor boolean default false,
  created_at timestamptz default now()
);

-- Listings
create table public.listings (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  price numeric(10,2) not null check (price > 0),
  card_type text not null check (card_type in ('pokemon', 'mtg', 'sports', 'other')),
  condition text not null check (condition in ('poor', 'good', 'excellent', 'near_mint', 'mint', 'graded')),
  grade text,
  grade_company text check (grade_company in ('PSA', 'BGS', 'CGC')),
  images text[] default '{}',
  status text not null default 'active' check (status in ('active', 'sold', 'removed')),
  is_auction boolean default false,
  created_at timestamptz default now()
);

-- Orders
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  listing_id uuid references public.listings(id) not null,
  total numeric(10,2) not null,
  platform_fee numeric(10,2) not null,
  shipping_cost numeric(10,2) default 0,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  easypost_shipment_id text,
  tracking_number text,
  status text not null default 'paid' check (status in ('paid', 'shipped', 'delivered', 'disputed', 'refunded')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;

-- RLS: profiles
create policy "Public profiles readable" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- RLS: listings
create policy "Active listings readable" on public.listings for select using (status = 'active' or seller_id = auth.uid());
create policy "Sellers create listings" on public.listings for insert with check (auth.uid() = seller_id);
create policy "Sellers update own listings" on public.listings for update using (auth.uid() = seller_id);

-- RLS: orders
create policy "Buyers see own orders" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "System creates orders" on public.orders for insert with check (auth.uid() = buyer_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
