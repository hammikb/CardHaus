do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_listing_id_key'
  ) then
    alter table public.orders
      add constraint orders_listing_id_key unique (listing_id);
  end if;
end $$;

create unique index if not exists orders_stripe_payment_intent_id_key
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
