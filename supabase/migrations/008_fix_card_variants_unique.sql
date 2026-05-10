-- Fix card_variants unique constraint to work with ON CONFLICT
-- Drop expression-based index that ON CONFLICT can't use
DROP INDEX IF EXISTS public.idx_card_variants_unique;

-- Create proper unique constraint that ON CONFLICT can match
ALTER TABLE public.card_variants
DROP CONSTRAINT IF EXISTS card_variants_unique;

ALTER TABLE public.card_variants
ADD CONSTRAINT card_variants_unique UNIQUE (card_id, set_id, language, edition);
