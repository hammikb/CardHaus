-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id BIGSERIAL PRIMARY KEY,
  pokemon_tcg_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  card_number TEXT,
  game TEXT NOT NULL DEFAULT 'pokemon',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_game ON cards(game);

-- Create card_variants table
CREATE TABLE IF NOT EXISTS card_variants (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  set_id TEXT,
  set_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  edition TEXT,
  rarity TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_variants_card_id ON card_variants(card_id);
CREATE INDEX IF NOT EXISTS idx_card_variants_set_id ON card_variants(set_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_variant ON card_variants(card_id, set_id, language, COALESCE(edition, ''));

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  set_id TEXT,
  set_name TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT 'pokemon',
  language TEXT NOT NULL DEFAULT 'English',
  image_url TEXT,
  msrp NUMERIC(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_set_id ON products(set_id);
CREATE INDEX IF NOT EXISTS idx_products_game ON products(game);

-- Update listings table
ALTER TABLE IF EXISTS listings ADD COLUMN IF NOT EXISTS card_variant_id BIGINT REFERENCES card_variants(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS listings ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS listings ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'single';

CREATE INDEX IF NOT EXISTS idx_listings_card_variant_id ON listings(card_variant_id);
CREATE INDEX IF NOT EXISTS idx_listings_product_id ON listings(product_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);

-- RLS Policies
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Cards: public read
CREATE POLICY cards_select ON cards FOR SELECT USING (true);

-- Card variants: public read
CREATE POLICY card_variants_select ON card_variants FOR SELECT USING (true);

-- Products: public read
CREATE POLICY products_select ON products FOR SELECT USING (true);

-- Listings: public read, sellers can only edit own
CREATE POLICY listings_select ON listings FOR SELECT USING (true);
CREATE POLICY listings_insert ON listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY listings_update ON listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY listings_delete ON listings FOR DELETE USING (auth.uid() = seller_id);
