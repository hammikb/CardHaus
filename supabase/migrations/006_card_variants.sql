-- Expand card_type enum to support more TCGs
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_card_type_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_card_type_check
  CHECK (card_type IN ('pokemon','mtg','sports','yugioh','lorcana','one_piece','digimon','other'));

-- Add product_type column (single/graded/sealed)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'single'
  CHECK (product_type IN ('single','graded','sealed'));

-- Add sealed-specific metadata columns
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS sealed_type text
  CHECK (sealed_type IS NULL OR sealed_type IN ('booster_box','booster_pack','elite_trainer_box','collection_box','tin','bundle','blister','other'));

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS quantity int NOT NULL DEFAULT 1
  CHECK (quantity > 0);

-- Create canonical cards table (from TCGCSV API)
CREATE TABLE IF NOT EXISTS public.cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tcgcsv_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  number TEXT,
  game TEXT NOT NULL DEFAULT 'pokemon',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_tcgcsv_id ON public.cards(tcgcsv_id);
CREATE INDEX IF NOT EXISTS idx_cards_game ON public.cards(game);

-- Create card_variants table (set/language/edition variants)
CREATE TABLE IF NOT EXISTS public.card_variants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  set_id TEXT,
  set_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  edition TEXT,
  rarity TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_variants_unique ON public.card_variants(card_id, set_id, language, COALESCE(edition, ''));
CREATE INDEX IF NOT EXISTS idx_card_variants_card_id ON public.card_variants(card_id);
CREATE INDEX IF NOT EXISTS idx_card_variants_set_id ON public.card_variants(set_id);

-- Create products table (sealed products: booster boxes, tins, etc.)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  set_id TEXT,
  set_name TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT 'pokemon',
  language TEXT NOT NULL DEFAULT 'English',
  image_url TEXT,
  msrp NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_set_id ON public.products(set_id);
CREATE INDEX IF NOT EXISTS idx_products_game ON public.products(game);

-- Add foreign key columns to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS card_variant_id uuid REFERENCES public.card_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'single';

CREATE INDEX IF NOT EXISTS idx_listings_product_type ON public.listings(product_type);
CREATE INDEX IF NOT EXISTS idx_listings_card_variant_id ON public.listings(card_variant_id);
CREATE INDEX IF NOT EXISTS idx_listings_product_id ON public.listings(product_id);

-- Enable RLS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies: public read access
DROP POLICY IF EXISTS "Cards are publicly readable" ON public.cards;
DROP POLICY IF EXISTS "Card variants are publicly readable" ON public.card_variants;
DROP POLICY IF EXISTS "Products are publicly readable" ON public.products;

CREATE POLICY "Cards are publicly readable" ON public.cards FOR SELECT USING (true);
CREATE POLICY "Card variants are publicly readable" ON public.card_variants FOR SELECT USING (true);
CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (true);

-- Service role insert policies (for sync)
CREATE POLICY "Service can insert cards" ON public.cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert card_variants" ON public.card_variants FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert products" ON public.products FOR INSERT WITH CHECK (true);
