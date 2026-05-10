-- Supabase/PostgREST upsert needs a real unique constraint matching onConflict.
-- NULLS NOT DISTINCT keeps edition = NULL from creating duplicate variants.
DELETE FROM public.card_variants a
USING public.card_variants b
WHERE a.id > b.id
  AND a.card_id = b.card_id
  AND a.set_id IS NOT DISTINCT FROM b.set_id
  AND a.language = b.language
  AND a.edition IS NOT DISTINCT FROM b.edition;

DROP INDEX IF EXISTS public.idx_card_variants_unique;
DROP INDEX IF EXISTS public.idx_unique_variant;

ALTER TABLE public.card_variants
  DROP CONSTRAINT IF EXISTS card_variants_unique;

ALTER TABLE public.card_variants
  ADD CONSTRAINT card_variants_unique UNIQUE NULLS NOT DISTINCT (card_id, set_id, language, edition);
