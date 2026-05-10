-- Pokemon TCG card ids are strings like "hgss4-1", so keep a text external id.
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS external_id TEXT;

UPDATE public.cards
SET external_id = tcgcsv_id::TEXT
WHERE external_id IS NULL AND tcgcsv_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_external_id_unique ON public.cards(external_id);
CREATE INDEX IF NOT EXISTS idx_cards_name ON public.cards(name);

ALTER TABLE public.card_variants ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);

DROP INDEX IF EXISTS idx_card_variants_unique;

DELETE FROM public.card_variants a
USING public.card_variants b
WHERE a.card_id = b.card_id
  AND a.set_id IS NOT DISTINCT FROM b.set_id
  AND a.language = b.language
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_variants_unique
  ON public.card_variants(card_id, set_id, language);
