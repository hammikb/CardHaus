-- Create cards table (canonical cards from TCGCSV API)
CREATE TABLE IF NOT EXISTS cards (
  id BIGSERIAL PRIMARY KEY,
  tcgcsv_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  number TEXT,
  game TEXT NOT NULL DEFAULT 'pokemon',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_tcgcsv_id ON cards(tcgcsv_id);
CREATE INDEX IF NOT EXISTS idx_cards_game ON cards(game);

-- Create card_variants table (set/language/edition variants)
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
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_variant UNIQUE (card_id, set_id, language, COALESCE(edition, ''))
);

CREATE INDEX IF NOT EXISTS idx_card_variants_card_id ON card_variants(card_id);
CREATE INDEX IF NOT EXISTS idx_card_variants_set_id ON card_variants(set_id);

-- Create products table (sealed products: booster boxes, tins, etc.)
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

-- Alter listings table: add card_variant_id, product_id, listing_type
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS card_variant_id BIGINT REFERENCES card_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'single';

-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies: public read access
CREATE POLICY "Cards are publicly readable" ON cards FOR SELECT USING (true);
CREATE POLICY "Card variants are publicly readable" ON card_variants FOR SELECT USING (true);
CREATE POLICY "Products are publicly readable" ON products FOR SELECT USING (true);
