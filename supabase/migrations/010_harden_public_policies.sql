-- Remove public cron log access and duplicate permissive read/write policies.
DROP POLICY IF EXISTS "Cron logs insertable by service role" ON public.cron_sync_logs;
DROP POLICY IF EXISTS "Cron logs readable by service role" ON public.cron_sync_logs;

DROP POLICY IF EXISTS "cards_select" ON public.cards;
DROP POLICY IF EXISTS "card_variants_select" ON public.card_variants;
DROP POLICY IF EXISTS "products_select" ON public.products;

DROP POLICY IF EXISTS "listings_select" ON public.listings;
DROP POLICY IF EXISTS "listings_insert" ON public.listings;
DROP POLICY IF EXISTS "listings_update" ON public.listings;

DROP POLICY IF EXISTS "Vendors manage own storefront" ON public.storefronts;
CREATE POLICY "Vendors insert own storefront" ON public.storefronts
  FOR INSERT WITH CHECK ((select auth.uid()) = vendor_id);
CREATE POLICY "Vendors update own storefront" ON public.storefronts
  FOR UPDATE USING ((select auth.uid()) = vendor_id)
  WITH CHECK ((select auth.uid()) = vendor_id);
CREATE POLICY "Vendors delete own storefront" ON public.storefronts
  FOR DELETE USING ((select auth.uid()) = vendor_id);

ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
ALTER FUNCTION public.update_review_score() SET search_path = public;
ALTER FUNCTION public.sync_cards_job() SET search_path = public, net, extensions;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
