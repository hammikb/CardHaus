create table cards (
  id uuid default gen_random_uuid() primary key,
  tcg_player_id text unique not null,
  name text not null,
  set text not null,
  price decimal(10, 2),
  rarity text,
  image_url text,
  condition text,
  synced_at timestamp default now(),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index cards_name_trgm on cards using gist (name gist_trgm_ops);
create index cards_set on cards (set);
create index cards_synced_at on cards (synced_at);
