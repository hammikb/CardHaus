-- Catalog tables are maintained by trusted server-side sync jobs.
-- Service-role clients bypass RLS, so public insert policies are unnecessary.
DROP POLICY IF EXISTS "Service can insert cards" ON public.cards;
DROP POLICY IF EXISTS "Service can insert card_variants" ON public.card_variants;
DROP POLICY IF EXISTS "Service can insert products" ON public.products;
